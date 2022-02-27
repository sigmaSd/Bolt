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

export function homeDirWithPanic(): string {
  const dir = homeDir();
  if (dir === null) {
    throw "Could not locate home directory";
  }
  return dir;
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
