describe('Basic Application Test', () => {
  it('should verify that true is true to ensure CI pipeline runs tests properly', () => {
    expect(true).toBe(true); // ESTE ERROR ROMPE EL CI INTENCIONALMENTE
  });
  
  it('verifies CI integration works correctly', () => {
    const environment = process.env.NODE_ENV || 'development';
    expect(environment).toBeDefined();
  });
});
