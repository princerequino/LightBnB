const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb',
  port: 5432
});



/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`
      SELECT *
      FROM users
      WHERE users.email = $1;`, [email])
    .then(res => res.rows[0]) // NEED TO SPECIFY
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
 const getUserWithId = function(id) {
  return pool
    .query(`
      SELECT *
      FROM users
      WHERE users.id = $1;`, [id])
    .then(res => res.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
 const addUser =  function(user) {
  return pool
    .query(`
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3) 
      RETURNING *;
    `, [user.name, user.email, user.password])
    .then(res => res.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`
      SELECT properties.*, reservations.* 
      FROM reservations
      JOIN properties ON properties.id = property_id
      WHERE reservations.guest_id = $1
      GROUP BY properties.id, reservations.id
      LIMIT $2;
    `, [guest_id, limit])
    .then(res => res.rows) // DO NOT SPECIFY. NEED ALL
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = function(options, limit = 10) {
  // 1. setup array to hold param
  const queryParams = [];

  // 2. query that comes before WHERE clause
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3. WHERE clauses

  // CITY ONLY
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `
    WHERE city LIKE $${queryParams.length} `;
  }
  // OWNER ID = whether length is 1 or more
  if (options.owner_id) {
    queryParams.push(options.owner_id);

    if (queryParams.length === 1) {
      queryString += `WHERE owner_id = $${queryParams.length}`;
    } else {
      queryString += `AND owner_id = $${queryParams.length}`;
    }
  }
  // MIN & MAX PRICE PER NIGHT = whether length is 2 or more
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100, options.maximum_price_per_night * 100);

    if (queryParams.length === 2) {
      queryString += `WHERE cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length}`;
    } else {
      queryString += `AND cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length}`;
    }
  }

  // 4. AFTER WHERE clause

  // MINIMUM RATING = whether there's HAVING or not
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating, limit); // need to push limit also as a second param

    queryString += `
    GROUP BY properties.id
    HAVING avg(property_reviews.rating) >= $${queryParams.length - 1}
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  } else {
    queryParams.push(limit);

    queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  }

  // 5. test code
  console.log(queryString, queryParams);

  // 6. RUN QUERY
  return pool
    .query(queryString, queryParams)
    .then((res) => res.rows)
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
