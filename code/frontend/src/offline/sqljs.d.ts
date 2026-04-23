declare module 'sql.js/dist/sql-wasm.js' {
  const initSqlJs: (config?: { locateFile?: (file: string) => string }) => Promise<unknown>;
  export default initSqlJs;
}
