// Minimal 16-bit Snowflake-like generator
class Snowflake16 {
  constructor() {
    this.sequence = 0;
    this.lastTimestamp = -1;
  }

  now() {
    return Date.now() & 0xffff; // keep only 16 bits
  }

  nextId() {
    let ts = this.now();
    if (ts === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0xff; // 8-bit sequence
      if (this.sequence === 0) {
        while ((ts = this.now()) <= this.lastTimestamp) {}
      }
    } else {
      this.sequence = 0;
    }
    this.lastTimestamp = ts;
    return (ts << 8) | this.sequence; // 16-bit id
  }
}

module.exports = new Snowflake16();
