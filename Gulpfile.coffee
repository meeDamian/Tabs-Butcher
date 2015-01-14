'use strict'

gulp    = require 'gulp'
g       = require('gulp-load-plugins')()

g.del   = require 'del'
g.vinyl = require 'vinyl-paths'
combine = require 'stream-combiner'


APP_BASE = base: './app'
MAPS_DIR = './'
DIST_DIR = 'dist'


#
# Linting
#

# COFFEESCRIPT
gulp.task 'lintCoffee', ->
  gulp.src [
      'app/**/*.coffee'
      'Gulpfile.coffee'
    ]
    .pipe g.coffeelint()
    .pipe g.coffeelint.reporter()

# JAVASCRIPT
gulp.task 'lintJs', ->
  gulp.src [
    'app/**/*.{js,htm,html}'
    'Gulpfile.js'
  ]
  .pipe g.jshint.extract() # extract js from htm(l) files
  .pipe g.jshint()
  .pipe g.jshint.reporter 'jshint-stylish'

# CSS
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


#
# Building
#

# STATIC
staticGlob = [
  'app/images/**'
  'app/_locales/**'
  'app/manifest.json'
  'app/**/*.{js,css}' # libs and other non-coffee
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


# COFFEESCRIPT
coffeeGlob = [
  'app/**/*.coffee'
]
coffeePipe = (type) ->
  pipe = [
    g.plumber()
    g.sourcemaps.init()
    g.coffee().on 'error', g.util.log
  ]
  pipe.push g.uglify() if type is 'release'

  pipe.push g.sourcemaps.write './'

  if type is 'debug'
    pipe.push gulp.dest 'dist',
      g.livereload()

  combine pipe

gulp.task 'compileCoffee', ->
  gulp.src coffeeGlob, APP_BASE
    .pipe coffeePipe 'debug'


# STYLUS
stylusGlob = [
  'app/**/*.styl'
]
stylusPipe = (type) ->
  pipe = [
    g.plumber()
    g.sourcemaps.init()
    g.stylus compress: type is 'release'
    g.sourcemaps.write './'
  ]

  if type is 'debug'
    pipe.push gulp.dest 'dist',
      g.livereload()

  combine pipe

gulp.task 'compileStylus', ->
  gulp.src stylusGlob, APP_BASE
    .pipe stylusPipe 'debug'


#
# Watching
#
deletionFilter = ->
  g.filter (file) -> file.event isnt 'deleted'

# STATIC
gulp.task 'watchStatic', ->
  deletedFilter = deletionFilter()

  g.livereload.listen()

  g.watch staticGlob, APP_BASE
    .pipe deletedFilter
    .pipe staticPipe()

  deletedFilter.restore end: true
    .pipe gulp.dest 'dist'
    .pipe g.vinyl g.del

# COFFEESCRIPT
gulp.task 'watchCoffee', ->
  deletedFilter = deletionFilter()

  g.livereload.listen()

  g.watch coffeeGlob, APP_BASE
    .pipe deletedFilter
    .pipe coffeePipe 'debug'

  deletedFilter.restore end: true
    .pipe gulp.dest 'dist'
    .pipe g.vinyl (file, cb) ->
      g.del file.replace(/.coffee$/, '.js{,.map}'), cb

# STYLUS
gulp.task 'watchStylus', ->
  deletedFilter = deletionFilter()

  g.livereload.listen()

  g.watch stylusGlob, APP_BASE
    .pipe deletedFilter
    .pipe stylusPipe 'debug'

  deletedFilter.restore end: true
    .pipe gulp.dest 'dist'
    .pipe g.vinyl (file, cb) ->
      g.del file.replace(/.styl$/, '.css{,.map}'), cb


# I do dislike this fn too
getNameAndVersion = ->
  pkg = require './package.json'
  man = require './app/manifest.json'

  name: pkg.name
  version: man.version


#
# User tasks
#
gulp.task 'bumpMajor', ->
  gulp.src 'app/manifest.json'
    .pipe g.bump type: 'major'
    .pipe gulp.dest './app'

gulp.task 'bumpMinor', ->
  gulp.src 'app/manifest.json'
    .pipe g.bump type: 'minor'
    .pipe gulp.dest './app'

gulp.task 'bumpPatch', ->
  gulp.src 'app/manifest.json'
    .pipe g.bump type: 'patch'
    .pipe gulp.dest './app'

gulp.task 'bump', ['bumpPatch']

# one time build
gulp.task 'buildDebug', [
  'staticCopy'
  'compileCoffee'
  'compileStylus'
]

gulp.task 'buildRelease', ['lint', 'bump'], ->
  app = getNameAndVersion()

  jsFilter = g.filter '**/*.js'
  cssFilter = g.filter '**/*.css'
  coffeeFilter = g.filter '**/*.coffee'
  stylusFilter = g.filter '**/*.styl'
  imagesFilter = g.filter '**/images/**'
  manifestFilter = g.filter '**/manifest.json'

  gulp.src [
    'app/**'
    '!**/chromereload.coffee'

  ], APP_BASE

    .pipe jsFilter
    .pipe g.uglify()
    .pipe jsFilter.restore()

    .pipe cssFilter
    .pipe g.minifyCss()
    .pipe cssFilter.restore()

    .pipe coffeeFilter
    .pipe coffeePipe 'release'
    .pipe coffeeFilter.restore()

    .pipe stylusFilter
    .pipe stylusPipe 'release'
    .pipe stylusFilter.restore()

    .pipe imagesFilter
    .pipe g.imagemin()
    .pipe imagesFilter.restore()

    .pipe manifestFilter
    .pipe g.jsonEditor (json) ->
      json.background.scripts = json.background.scripts.filter (file) ->
        not /chromereload.js$/.test file
      json
    .pipe manifestFilter.restore()

    .pipe g.zip app.name + '-' + app.version + '.zip'
    .pipe gulp.dest 'package'

# continuus builds and livereload
gulp.task 'debug', [
  'lint'
  'buildDebug'
  'watchCoffee'
  'watchStylus'
  'watchStatic'
]