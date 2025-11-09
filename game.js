module.exports = {
  mine: () => {
    // simple random mine: 1-5 crystals
    return Math.floor(Math.random()*5)+1;
  }
};
