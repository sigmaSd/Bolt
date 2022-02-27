# Bolt

Use deno libraries that depends on rust dynamic libraries in a very convenient
way

## Usage

```ts
import { Bolt, Crate } from "https://deno.land/x/bolt@0.1.1/src/bolt.ts";

const ddirs: Crate = {
  name: "ddirs",
  // The url of rust crate, this allows user to just import your library for it to work out of the box
  url: "https://github.com/sigmaSd/ddirs2",
  // Path of a local crate, this allows you as a developer to test your changes locally
  // Url takes precedence over path but if "BOLT" environment variable is set to "dev", path takes precedence (which you should set when developing)
  path: "./ddirsRust",
};

const bolt = new Bolt([ddirs]);
await bolt.init();

const libDdirs = bolt.getLib(ddirs.name);
function config_dir(): string | undefined {
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
}

console.log(config_dir());
```

## How it works

For each crate specified in its constructor Bolt will

- If the `crate.repo` is specified it clones the crate `~/.bolt/src`
- Compile the crate from either `~/.bolt/src` or from `crate.path` if
  `crate.repo` is not specified or if "BOLT" environment variable is set to
  "dev"
- Now using `bolt.getLib(crateName)` will return the compiled lib path

For a full example see https://github.com/sigmaSd/ddirs2
