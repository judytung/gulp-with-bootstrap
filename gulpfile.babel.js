import gulp from 'gulp';
const { series, parallel, src, dest, watch } = gulp;
import frontMatter from 'gulp-front-matter'
import autoprefixer from 'autoprefixer';
import minimist from "minimist";
import browserSync from "browser-sync";
import del from 'del';
import nodeSass from 'node-sass';
import gulpLoadPlugins from 'gulp-load-plugins';
const $ = gulpLoadPlugins();
import gulpSass from 'gulp-sass';

const sass = gulpSass(nodeSass);

// // 環境變數
var envOptions = {
    string: "env",
    default: { env: "develop" }
  }
  var options = minimist(process.argv.slice(2), envOptions)
  var envIsPro = options.env === "production" || options.env == "pro"
  
  export function envNow(cb) {
    console.log(`env now is: ${options.env}, so envIsPro is ${envIsPro}`)
    console.log(options)
    cb()
  }

// 將 source 裡的 html 複製到 public 

export function ejs() {
  return src(['./source/**/*.ejs', './source/**/*.html'])
    .pipe($.plumber())
    .pipe($.frontMatter())
    .pipe(
      $.layout((file) => {
        return file.frontMatter;
      }),
    )
    .pipe(dest('./public'))
    .pipe($.if(!envIsPro, browserSync.stream()))
}

// copy file

export function copy() {
    return src([
        "./source/**/**",
        "!source/javascripts/**/**",
        "!source/style/**/**",
        "!source/**/*.ejs",
        "!source/**/*.html"
      ])
      .pipe(dest("./public"))
}



// clean
export function clean(cb) {
    del(["./public/**", "./.tmp/**"])
    cb()
}



// CSS 

function scss() {
  const processors = [ 
    autoprefixer()
  ];

  return src("./source/style/**/*.scss")
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe(
      sass({
        outputStyle: "nested",   // outputStyle 指的是編譯出來的 CSS 要長成什麼樣子，default is nested
        includePaths: ["./node_modules/bootstrap/scss"] // 在 SASS 檔中 @import 其他 SASS 檔案時，會額外從哪些路徑尋找
      }).on("error", sass.logError)
    )
    .pipe($.postcss(processors))
    .pipe($.if(envIsPro, $.cleanCss()))   // 要不要壓縮 css
    .pipe($.sourcemaps.write("."))
    .pipe(dest("./public/style"));
}


// JS 合併第三方 JS 套件
export function vendorJS () {
    return src([
            "./node_modules/jquery/dist/jquery.slim.min.js",
            "./node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"
          ])
        .pipe($.concat("vendor.js"))
        .pipe(dest("./public/javascripts"))
}

// JS 將自己編寫的 ES6 轉碼成 ES5

function babel() {
  return src("./source/javascripts/**/*.js")
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe(
      $.babel({
        presets: ["@babel/env"]
      })
    )
    .pipe($.concat("all.js"))
    .pipe(
      $.if(
        envIsPro,
        $.uglify({
          compress: {
            drop_console: true
          }
        })
      )        
    )
    .pipe($.sourcemaps.write("."))
    .pipe(dest("./public/javascripts"))
}

// image 壓縮

function imageMin() {
  return src("./source/images/*")
    .pipe($.if(envIsPro, $.imagemin()))
    .pipe(dest("./public/images"))
    .pipe($.if(envIsPro, browserSync.stream()))
}

// 預覽

function browser() {
    browserSync.init({
      server: {
        baseDir: "./public",
        reloadDebounce: 2000  // 每次重新整理必須間隔秒數
      },
      port: 5000
    })
}

export function devWatch() {
    watch(["./source/**/*.html", "./source/**/*.ejs"], ejs)
    watch(
      [ "./source/style/**/*.scss"], scss)
    watch("./source/javascripts/**/*.js", babel)
    console.log("watching file ~")
}

// 指令



gulp.task('default', parallel(imageMin, babel, vendorJS, ejs, scss, browser, devWatch));

gulp.task('build', series(series(clean, copy), parallel(vendorJS, babel, scss, ejs, imageMin)))

  
