const fs = require("fs");
const path = require("path");
const yauzl = require("yauzl");
const yazl = require("yazl");

const vsixPath = path.resolve(process.argv[2] || "revamp-0.1.0.vsix");
const tempPath = `${vsixPath}.tmp`;

function readZipEntries(filePath) {
  return new Promise((resolve, reject) => {
    const entries = [];

    yauzl.open(filePath, { lazyEntries: true }, (openError, zip) => {
      if (openError) {
        reject(openError);
        return;
      }

      zip.readEntry();
      zip.on("entry", (entry) => {
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) {
            reject(streamError);
            return;
          }

          const chunks = [];
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("end", () => {
            entries.push({
              name: entry.fileName,
              mode: entry.externalFileAttributes >>> 16,
              buffer: Buffer.concat(chunks),
            });
            zip.readEntry();
          });
        });
      });
      zip.on("end", () => resolve(entries));
      zip.on("error", reject);
    });
  });
}

async function main() {
  const entries = await readZipEntries(vsixPath);
  const output = new yazl.ZipFile();
  const writeStream = fs.createWriteStream(tempPath);
  const done = new Promise((resolve, reject) => {
    writeStream.on("close", resolve);
    writeStream.on("error", reject);
    output.outputStream.on("error", reject);
  });

  output.outputStream.pipe(writeStream);

  for (const entry of entries) {
    let buffer = entry.buffer;
    if (entry.name === "extension/package.json") {
      const manifest = JSON.parse(buffer.toString("utf8"));
      delete manifest.repository;
      delete manifest.bugs;
      delete manifest.homepage;
      delete manifest.files;
      delete manifest.scripts;
      delete manifest.devDependencies;
      buffer = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    } else if (entry.name === "extension.vsixmanifest") {
      buffer = Buffer.from(
        buffer
          .toString("utf8")
          .replace(/\n\s*<Property Id="Microsoft\.VisualStudio\.Services\.Links\.(?:Source|Getstarted|GitHub|Support|Learn)" Value="[^"]*" \/>/g, "")
      );
    }

    output.addBuffer(buffer, entry.name, {
      mode: entry.mode || 0o100644,
      mtime: new Date("1980-01-01T00:00:00.000Z"),
    });
  }

  output.end();
  await done;

  fs.renameSync(tempPath, vsixPath);
}

main().catch((error) => {
  if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true });
  console.error(error);
  process.exitCode = 1;
});
