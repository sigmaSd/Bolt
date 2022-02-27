# Bolt

Use deno libraries that depends on rust dynamic libraries in a very convenient
way

## Usage

```ts
import { Bolt, Crate } from "../bolt/src/bolt.ts";

const ddirs: Crate = {
  name: "ddirs",
  // The url of rust crate, this allows user to just import this file to work out of the box
  url: "https://github.com/sigmaSd/ddirs2",
  // Path of a local crate, this allows you as a developper to test your changes locally, url takes precedence over path but if "BOLT" environment variable is set to "dev", path takes precedence (which you should set when developping)
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

For each crate specified in its contstructor Bolt will

- if the `crate.url` is specified it clones the crate `~/.bolt/src`
- Compile the crate from either `~/.bolt/src` or from `crate.path` if
  `crate.url` is not specified or if "BOLT" environment variable is set to "dev"
- Now using `bolt.getLib(crateName)` will return the compiled lib path

For a full example see https://github.com/sigmaSd/ddirs2
