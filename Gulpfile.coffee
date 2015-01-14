'use strict'

gulp    = require 'gulp'
g       = require('gulp-load-plugins')()

g.del   = require 'del'
combine = require 'stream-combiner'


APP_BASE = base: './app'
MAPS_DIR = './'
DIST_DIR = 'dist'


# Moving stuff around
cp = (file) ->
  gulp.src 'app/' + file, APP_BASE
    .pipe gulp.dest 'dist/'

gulp.task 'clean', (cb) ->
  g.del ['dist/'], cb

gulp.task 'images',   -> cp 'images/**'
gulp.task 'locales',  -> cp '_locales/**'
gulp.task 'manifest', -> cp 'manifest.json'
gulp.task 'copy', [
  'images'
  'locales'
  'manifest'
]

# Linting
gulp.task 'lintCoffee', ->
  gulp.src [
      'app/**/*.coffee'
      'Gulpfile.coffee'
    ]
    .pipe g.coffeelint()
    .pipe g.coffeelint.reporter()

gulp.task 'lintJs', ->
  gulp.src [
    'app/**/*.{js,htm,html}'
    'Gulpfile.js'
  ]
  .pipe g.jshint.extract() # extract js from htm(l) files
  .pipe g.jshint()
  .pipe g.jshint.reporter 'jshint-stylish'

gulp.task 'lintCss', ->
  gulp.src [
    'app/**/*.css'
  ]
  .pipe g.csslint()
  .pipe g.csslint.reporter()

gulp.task 'lint', [
  'lintCoffee'
  'lintJs'
  'lintCss'
]


stylusGlob = [
  'app/**/*.styl'
]
stylusPipe = ->
  combine g.plumber(),
    g.sourcemaps.init()
    g.stylus compress: true
    g.sourcemaps.write './'
    gulp.dest 'dist'

gulp.task 'compileStylus', ->
  gulp.src stylusGlob, APP_BASE
  .pipe stylusPipe


coffeeGlob = [
  'app/**/*.coffee'
  '!app/**/chromereload.coffee'
]

coffeePipe = ->
  combine g.plumber(),
    g.sourcemaps.init()
    g.coffee().on 'error', g.util.log
    g.uglify()
    g.sourcemaps.write './'
    gulp.dest 'dist'

gulp.task 'compileCoffee', ->
  gulp.src coffeeGlob, APP_BASE
    .pipe coffeePipe()


gulp.task 'compile', [
  'compileStylus'
  'compileCoffee'
]


deletedFilter = g.filter (file) -> file.event isnt 'deleted'

gulp.task 'debug', ->
  g.watch coffeeGlob, APP_BASE
    .pipe coffeePipe()

  g.watch stylusGlob, APP_BASE
    .pipe stylusPipe()

  g.watch 'app/images/**', APP_BASE
    .pipe deletedFilter
    .pipe gulp.dest 'dist/'

  deletedFilter.restore end: true
    .pipe gulp.dest 'dist'
    .pipe g.clean()

gulp.task 'lalala', ['clean'], ->
  gulp.start [
    'compile'
    'copy'
  ]