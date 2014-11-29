'use strict'

gulp  = require 'gulp'
g     = require('gulp-load-plugins')()

g.del = require 'del'

cp = (file) ->
  gulp.src 'app/' + file, base: './app'
    .pipe gulp.dest 'dist/'

gulp.task 'lint', ->
  gulp.src [
      'app/**/*.coffee'
      'Gulpfile.coffee'
    ]
    .pipe g.coffeelint()
    .pipe g.coffeelint.reporter()


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


gulp.task 'compile', ->
  gulp.src [
      'app/**/*.coffee'
      '!app/**/chromereload.coffee'
    ], base: './app'
    .pipe g.sourcemaps.init()
    .pipe g.coffee().on 'error', g.util.log
    .pipe g.uglify()
    .pipe g.sourcemaps.write './'
    .pipe gulp.dest 'dist'


gulp.task 'debug', ['clean'], ->
  gulp.start [
    'compile'
    'copy'
  ]