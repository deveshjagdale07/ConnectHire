const bcrypt = require('bcrypt');
const password = '123'; // Change this to your desired password

async function generateHash() {
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
}

generateHash();