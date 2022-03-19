import { join } from "https://deno.land/std@0.127.0/path/mod.ts";

import {
  fileExists,
  homeDirWithPanic,
  libNameFromCrateName,
  mkdirAllowExists,
} from "./utils.ts";

/**
 * A Rust crate that will be compiled to a dynamic library
 * The `repo` takes precedence over `path` unless the environment variable "BOLT" is set to "dev"
 */
export interface Crate {
  name: string;
  repo?: { url: string; relativePath: string };
  path?: string;
}

/**
 * Bolt main class
 */
export class Bolt {
  #buildType = (Deno.env.get("BOLT") === "dev") ? "dev" : "release";
  #crates: Crate[];

  /**
   * Takes a list of crates
   * If any of the crates is invalid (doesn't have neither url nor path) it will throw an error
   * If any of the runtime dependencies (git, cargo nightly) is missing it will throw an error
   */
  constructor(crates: Crate[]) {
    const checkRuntimeDeps = async (bins: string[][]) => {
      for (const bin of bins) {
        try {
          const status = await Deno.run({
            cmd: bin,
            stdout: "null",
            stderr: "null",
          }).status();
          if (!status.success) {
            throw `Can not read required runtime dependency '${
              bin[0]
            }' version`;
          }
        } catch {
          throw `Missing required runtime dependency '${bin[0]}'`;
        }
      }
    };
    const checkCratesAreValid = (crates: Crate[]) => {
      for (const crate of crates) {
        if (crate.repo === undefined && crate.path === undefined) {
          throw "The crate `url` or the crate `path` needs to be specified.";
        }
      }
    };
    checkRuntimeDeps(
      [["git", "--version"], [
        "cargo",
        "+nightly",
        "--version",
      ]],
    );
    checkCratesAreValid(crates);

    this.#crates = crates;
  }
  /**
   * Compile the specified crates
   * This function needs to be called before trying to load the rust dynamic libraries
   */
  async init() {
    // Create Bolt directories
    const boldDir = join(homeDirWithPanic(), "/.bolt");
    await mkdirAllowExists(boldDir);
    await mkdirAllowExists(join(boldDir, "/src"));
    await mkdirAllowExists(join(boldDir, "/lib"));

    // Clone and compile the crates
    const crateLibDir = join(boldDir, "/lib/");
    for (const crate of this.#crates) {
      if (
        this.#buildType == "release" &&
        await fileExists(
          join(
            crateLibDir,
            "release/",
            libNameFromCrateName(crate.name),
          ),
        )
      ) {
        continue;
      }
      const compileFromGit = async () => {
        const crateSrcDir = join(boldDir, "/src/", crate.name);
        await gitClone(crate.repo!.url, crateSrcDir); // compileFromGit should only be used if url is defined
        await cargoCompile(
          join(crateSrcDir, crate.repo!.relativePath),
          crateLibDir,
          "release",
        );
      };
      const compileFromPath = async (buildType: "dev" | "release") => {
        await cargoCompile(crate.path!, crateLibDir, buildType); // compileFromPath should only be used if path is defined
      };
      if (crate.repo !== undefined && crate.path !== undefined) {
        // The user has inputted both url and path
        // We will discern the priority using an environment variable
        if (this.#buildType === "dev") {
          await compileFromPath("dev");
        } else {
          await compileFromGit();
        }
      } else if (crate.repo !== undefined) {
        await compileFromGit();
      } else {
        // crate.path !== undefined
        await compileFromPath(this.#buildType as "dev" | "release");
      }
    }
  }
  /**
   * Gets the compiled library path of the specified crate
   */
  getLib(crateName: string): string {
    return join(
      homeDirWithPanic(),
      ".bolt/lib/",
      (this.#buildType === "dev") ? "debug" : "release",
      libNameFromCrateName(crateName),
    );
  }
}

async function gitClone(url: string, crateSrcDir: string) {
  await Deno.run({
    cmd: ["git", "clone", url, crateSrcDir],
  }).status();
}

async function cargoCompile(
  crateSrcDir: string,
  crateLibDir: string,
  buildType: "dev" | "release",
) {
  await Deno.run({
    cmd: [
      "cargo",
      "+nightly",
      "rustc",
      "-Z",
      "unstable-options",
      "--crate-type",
      "cdylib",
      "--release",
      "--manifest-path",
      join(crateSrcDir, "/Cargo.toml"),
      "--target-dir",
      crateLibDir,
    ].filter((arg) => (buildType === "dev") ? arg !== "--release" : arg),
  }).status();
}
