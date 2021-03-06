/**
 * CSS URL Resolver
 * A gulp task to resolve and copy assets generated by CSS files
 * 
 * @author Matheus Giovani
 * @since 06/04/2021
 */

const path = require("path");
const fs = require("fs");
const murmur2 = require("murmur2");
const through = require("through2");
const fileType = require("file-type");

const ltrim = require("locutus/php/strings/ltrim");
const rtrim = require("locutus/php/strings/rtrim");

/**
 * The regex used to extract URLs from CSS files
 * 
 * @var {RegExp}
 */
const URL_REGEX = /url\((.*?)\)/ig;

/**
 * An object containing mime types and its final folders
 * 
 * @var {Object}
 */
const mimeTypes = [
    {
        regex: /image\/.*/gi,
        folder: "img"
    },
    {
        regex: /audio\/.*/gi,
        folder: "audio"
    },
    {
        regex: /video\/.*/gi,
        folder: "video"
    },
    {
        regex: /(font\/.*|application\/vnd.ms-fontobject)/gi,
        folder: "fonts"
    }
];

/**
 * Hashes a file to generate a filename
 * 
 * @param {String} fileName The file path
 * @returns {String}
 */
function hashFile(fileName) {
    return murmur2(fs.readFileSync(fileName, "binary"), 0, true);
}

module.exports = (config) => {
    // Setup the defaults
    config = Object.assign({
        aliases: {},
        publicPath: "/",
        includePaths: []
    }, config);

    return through.obj(async (file, enc, cb) => {
        if (!file.contents) {
            return cb(null, file);
        }

        // Convert the file contents to a string
        let content = file.contents.toString("utf8");

        // Iterate over all mime types
        for(let mimeType of mimeTypes) {
            const relativeMimeFolder = path.resolve(config.publicPath, mimeType.folder);

            // Check if the relative directory exists
            if (fs.existsSync(relativeMimeFolder)) {
                // Clean it
                fs.rmdirSync(relativeMimeFolder, { recursive: true });
            }
        }

        const replaces = [];

        // Iterate over all URLs
        while((result = URL_REGEX.exec(content)) !== null) {
            // Get only the URL
            let url = ltrim(rtrim(result[1].trim(), "'\""), "'\"");

            // Check if it's a data URL
            if (url.substr(0, 5) === "data:") {
                continue;
            }

            // Extract the file name from it
            let fileName = url.split("?")[0].split("#")[0];
            let originalFileName = fileName;

            // Normalize it
            fileName = path.normalize(fileName).replace(/\\/g, "/").replace(/\/\//g, "/");

            // Iterate over all aliases
            for(let alias of Object.keys(config.aliases)) {
                // Check if the URL is prefixed by this alias
                if (fileName.startsWith(alias + "/")) {
                    // Replace it
                    fileName = fileName.replace(alias, config.aliases[alias]);
                    break;
                }
            }

            // Check if the file still doesn't exists
            if (!fs.existsSync(fileName)) {
                // Iterate over all include paths
                for(let includePath of config.includePaths) {
                    // Get the file name relative to this include path
                    const relative = path.resolve(includePath, fileName);

                    // Check if the file exists for this include path
                    if (fs.existsSync(relative)) {
                        // Replace it
                        fileName = relative;
                        break;
                    }
                }
            }

            // Check if the filename exists
            if (fs.existsSync(fileName)) {
                // Hash it
                const hash = hashFile(fileName);

                // Get the mime type
                let { mime } = await fileType.fromFile(fileName);

                // Check if it's a SVG file
                if (mime === "application/xml" && path.extname(fileName) === ".svg") {
                    // Assume it's a SVG file
                    mime = "image/svg+xml";
                }

                let outputDir = config.publicPath;

                // Iterate over all mime types
                for(let mimeType of mimeTypes) {
                    // Check if this mime type matches
                    if (mime === mimeType.regex || mime.match(mimeType.regex)) {
                        // Get the output directory for it
                        outputDir = path.resolve(outputDir, mimeType.folder);
                        break;
                    }
                }

                // Get the output filename
                const outputFileName = path.resolve(outputDir, hash + path.extname(fileName));

                // Create the file output directory if it doesn't exists yet
                !fs.existsSync(outputDir) && fs.mkdirSync(outputDir, { recursive: true });

                const originalEscaped = result[0].replace(/[^A-Za-z0-9_]/g, "\\$&");
                
                // Find for the original result
                const find = new RegExp(originalEscaped, "g");

                // Replace the URL from the original result with the new URL
                const replace = result[0].replace(
                    new RegExp(originalFileName, "g"),
                    "../" + path.relative(config.publicPath, outputFileName).replace(/\\/g, "/")
                );

                // Push it into the replacements
                replaces.push({ find, replace, fileName, outputFileName });
            }
        }

        // Iterate over all replaces
        replaces.forEach((replace) => {
            // Replace it with the new public path
            content = content.replace(replace.find, replace.replace);

            console.log("????", replace.fileName, "was resolved to", replace.outputFileName);

            // Copy the file to the output directory
            fs.copyFileSync(replace.fileName, replace.outputFileName);
        });

        // Save the CSS file
        file.contents = Buffer.from(content);

        cb(null, file);
    });
};