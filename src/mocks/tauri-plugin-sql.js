class MockDatabase {
  async execute() { return { rowsAffected: 0 }; }
  async select() { return []; }
  async close() {}
}

export default {
  load: async () => new MockDatabase(),
};
