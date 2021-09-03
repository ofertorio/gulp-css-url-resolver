## gulp-css-url-resolver
A gulp task / stream to resolve CSS url() imports to public paths.
Works like webpack module resolution.

---

## Installation
Use your favorite package manager to install gulp-css-url-resolver.
```
yarn add gulp-css-url-resolver -D
```

```
npm i gulp-css-url-resolver --save-dev
```

## But why?
In case you want to compile CSS / Sass files using gulp and still want to have the resolution ability from webpack.

## How to use
Example using [gulp-sass](https://www.npmjs.com/package/gulp-sass):

src/index.sass
```css
.example {
    background-image: url("@module/image.png");
}
```

gulpfile.js
```javascript
const resolver = require("gulp-css-url-resolver");
const sass = require("gulp-sass");

// Pipe it to the CSS resolver
gulp.task("example", () => {
    gulp.src("src/index.sass")
        .pipe(sass())
        .pipe(resolver({
            publicPath: "https://example.com/image/",
            aliases: {
                "@module": __dirname + "/assets/"
            }
        }))
        .pipe(gulp.dest("dest/index.css"));
```

Output:
```css
.example {
    background-image: url("https://example.com/images/image.png");
}
```

## Options
| Option       | Description                                                                                                                                                                                                              | Type              |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| publicPath   | The public path that all files will be resolved to.                                                                                                                                                                      | string            |
| includePaths | Fallback include paths for non-existing and non-resolved imports.                                                                                                                                                        | string[]          |
| aliases      | An object contaning module resolution aliases.  For example: if you have `background-image: url("@mymodule/image.png")` and want to resolve it, you can add an alias to resolve it like `"@mymodule": "path/to/mymodule` | Record<string, string> |