declare module '@ianwremmel/pkgshift' {
  interface Package extends Object {
    scripts?: Record<string, string>;
    engines?: {
      node?: string;
      npm?: string;
    };
    'lint-staged': Record<string, string | string[]>;
    release?: Record<string, string | string[]>;
  }

  interface TransformAPI {
    setOrReplaceScript: (
      pkg: Package,
      options: {
        from?: string | RegExp;
        name: string;
        to: string;
      }
    ) => void;
  }

  interface TransformOptions {
    api: TransformAPI;
  }

  type transformCallback = (
    pkg: Package,
    options: TransformOptions
  ) => Package | Promise<Package>;

  function pkgShift(tx: transformCallback, pkg: Package): Promise<Package>;
}
