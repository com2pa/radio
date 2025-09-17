 PAGE_URL =  process.env.NODE_ENV === 'production'
    ? 'https://Radio.onrender.com'
    : 'http://localhost:5173';

const POSTGRED_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.DATABASE_URL_PRODUC
    : process.env.DATABASE_URL;

module.exports = {
  PAGE_URL,
  POSTGRED_URL,
};
