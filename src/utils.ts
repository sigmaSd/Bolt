export function libNameFromCrateName(crateName: string): string {
  let libSuffix = "";
  switch (Deno.build.os) {
    case "windows":
      libSuffix = "dll";
      break;
    case "darwin":
      libSuffix = "dylib";
      break;
    case "linux":
      libSuffix = "so";
      break;
  }
  return `lib${crateName}.${libSuffix}`;
}

export function homeDir(): string | null {
  switch (Deno.build.os) {
    case "linux":
    case "darwin":
      return Deno.env.get("HOME") ?? null;
    case "windows":
      return Deno.env.get("USERPROFILE") ?? null;
  }
}

export async function mkdirAllowExists(dir: string) {
  try {
    await Deno.mkdir(dir);
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) {
      throw (e);
    }
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false;
    }
    throw (e);
  }
}

import { Bolt, Crate } from "../bolt/src/bolt.ts";

const ddirs: Crate = {
  name: "ddirs",
  url: "https://github.com/sigmaSd/ddirs2",
  path: "./ddirsRust",
};

const bolt = new Bolt([ddirs]);
await bolt.init();

const libDdirs = bolt.getLib(ddirs.name);
const dylib = Deno.dlopen(libDdirs, {
  "config_dir": { parameters: [], result: "pointer" },
});
const maybeResult = dylib.symbols.config_dir();
if (maybeResult.valueOf() !== 0n) {
  const result = new Deno.UnsafePointerView(maybeResult);
  return result.getCString();
} else {
  return undefined;
}
