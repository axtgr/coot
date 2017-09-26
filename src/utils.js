const Os = require('os')
const { extname, resolve, join } = require('path')
const { readFileSync } = require('fs')
const _ = require('lodash')
const stripJsonComments = require('strip-json-comments')


const HOME_DIR = Os.homedir()


function resolvePath(basePath, path) {
  if (!path) {
    path = basePath
    basePath = null
  }

  if (path[0] === '~') {
    path = join(HOME_DIR, path.slice(1))
  }

  if (basePath && basePath[0] === '~') {
    basePath = join(HOME_DIR, basePath.slice(1))
  }

  if (basePath) {
    return resolve(basePath, path)
  } else {
    return path
  }
}

function readConfig(path) {
  let isJson = (extname(path).toLowerCase() === '.json')

  if (isJson) {
    let json = readFileSync(path, { encoding: 'utf8' })
    return JSON.parse(stripJsonComments(json))
  } else {
    // eslint-disable-next-line global-require
    return require(path)
  }
}

function mergeConfigs(...configs) {
  return configs.reduce((result, config) => {
    if (config) {
      let cootConfig = Object.assign({}, result.coot, config.coot)
      let taskConfig = Object.assign({}, result.task, config.task)
      Object.assign(result, config)
      result.coot = cootConfig
      result.task = taskConfig
    }
    return result
  }, {})
}

function resolveObjectPaths(config, keys, basePath) {
  config = _.cloneDeep(config)
  keys.forEach((key) => {
    let path = _.get(config, key)
    let resolvedPath = resolvePath(basePath, path)
    _.set(config, key, resolvedPath)
  })
  return config
}


module.exports = { resolvePath, readConfig, mergeConfigs, resolveObjectPaths }
