'use strict'

gulp    = require 'gulp'
g       = require('gulp-load-plugins')()

g.del   = require 'del'
g.vinyl = require 'vinyl-paths'
combine = require 'stream-combiner'


APP_BASE = base: './app'
MAPS_DIR = './'
DIST_DIR = 'dist'


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


# Building
staticGlob = [
  'app/images/**'
  'app/_locales/**'
  'app/manifest.json'
  'app/**/*.js' # libs and other non-coffee
]
staticPipe = ->
  filter = g.filter [
    'app/**/*.js'
  ]

  combine filter,
    g.uglify()
    filter.restore()
    gulp.dest 'dist'
    g.livereload()

gulp.task 'staticCopy', ->
  gulp.src staticGlob, APP_BASE
    .pipe staticPipe()


stylusGlob = [
  'app/**/*.styl'
]
stylusPipe = ->
  combine g.plumber(),
    g.sourcemaps.init()
    g.stylus compress: true
    g.sourcemaps.write './'
    gulp.dest 'dist'
    g.livereload()

gulp.task 'compileStylus', ->
  gulp.src stylusGlob, APP_BASE
  .pipe stylusPipe()


coffeeGlob = [
  'app/**/*.coffee'
]
coffeeDistGlob = [
  'app/**/*.coffee'
  '!app/**/chromereload.coffee'
]
coffeePipe = ->
  combine g.plumber(),
    g.sourcemaps.init()
    g.coffee().on 'error', g.util.log
    # g.uglify() # NOTE: uncomment to minify/obfuscate
    g.sourcemaps.write './'
    gulp.dest 'dist'
    g.livereload()

gulp.task 'compileCoffee', ->
  gulp.src coffeeGlob, APP_BASE
    .pipe coffeePipe()


# Watching
deletionFilter = ->
  g.filter (file) -> file.event isnt 'deleted'

gulp.task 'watchCoffee', ->
  deletedFilter = deletionFilter()

  g.livereload.listen()

  g.watch coffeeGlob, APP_BASE
    .pipe deletedFilter
    .pipe coffeePipe()

  deletedFilter.restore end: true
    .pipe gulp.dest 'dist'
    .pipe g.vinyl (file, cb) ->
      g.del file.replace(/.coffee$/, '.js{,.map}'), cb


gulp.task 'watchStylus', ->
  deletedFilter = deletionFilter()

  g.livereload.listen()

  g.watch stylusGlob, APP_BASE
    .pipe deletedFilter
    .pipe stylusPipe()

  deletedFilter.restore end: true
    .pipe gulp.dest 'dist'
    .pipe g.vinyl (file, cb) ->
      g.del file.replace(/.styl$/, '.css{,.map}'), cb


gulp.task 'watchStatic', ->
  deletedFilter = deletionFilter()

  g.livereload.listen()

  g.watch staticGlob, APP_BASE
    .pipe deletedFilter
    .pipe staticPipe()

  deletedFilter.restore end: true
    .pipe gulp.dest 'dist'
    .pipe g.vinyl g.del


# User tasks
gulp.task 'buildDebug', [
  'staticCopy'
  'compileCoffee'
  'compileStylus'
]

gulp.task 'debug', [
  'lint'
  'buildDebug'
  'watchCoffee'
  'watchStylus'
  'watchStatic'
]