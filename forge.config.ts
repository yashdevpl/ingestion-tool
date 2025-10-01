import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const plugins: ForgeConfig["plugins"] = [
  new VitePlugin({
    build: [
      {
        entry: "src/main.ts",
        config: "vite.main.config.ts",
        target: "main",
      },
      {
        entry: "src/preload.ts",
        config: "vite.preload.config.ts",
        target: "preload",
      },
      {
        entry: "src/workers/fileWorker.ts",
        config: "vite.main.config.ts",
        target: "main",
      },
      {
        entry: "src/workers/criParserWorker.ts",
        config: "vite.main.config.ts",
        target: "main",
      },
      {
        entry: "src/workers/fileRecordWorker.ts",
        config: "vite.main.config.ts",
        target: "main",
      },
      {
        entry: "src/workers/uploadWorker.ts",
        config: "vite.main.config.ts",
        target: "main",
      },
      {
        entry: "src/workers/listAndClassifyFiles.ts",
        config: "vite.main.config.ts",
        target: "main",
      },
    ],
    renderer: [
      {
        name: "main_window",
        config: "vite.renderer.config.ts",
      },
    ],
  }),
];

// ⬇️ FusesPlugin को केवल production/package के लिए add करें
if (process.env.NODE_ENV === "production") {
  plugins.push(
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    })
  );
}

const config: ForgeConfig = {
  packagerConfig: {
    protocols: [
      {
        name: "Vox Tool",
        schemes: ["vox-app"],
      },
    ],
    asar: true,
  },
  rebuildConfig: {},

  makers: [
    {
      name: "@electron-forge/maker-deb",
      config: {
        mimeType: ["x-scheme-handler/vox-app"],
      },
    },
    new MakerSquirrel({}),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins,
};

export default config;
