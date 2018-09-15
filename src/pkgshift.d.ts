declare module '@ianwremmel/pkgshift' {
  interface Package extends Object {}

  interface TransformAPI extends Object {}

  interface TransformOptions {
    api: TransformAPI;
  }

  type transformCallback = (
    pkg: Package,
    options: TransformOptions
  ) => Package | Promise<Package>;

  function pkgShift(tx: transformCallback, pkg: Package): Promise<Package>;
}
