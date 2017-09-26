const { statSync } = require('fs')
const appache = require('appache')
const { optionsToObject } = require('appache/common')
const { next } = require('appache/effects')
const api = require('appache-api-fluent')
const { resolvePath, readConfig, mergeConfigs } = require('./utils')
const defaultConfig = require('./config')


function makeHandler(fn, baseConfig) {
  return function* taskHandler(commandConfig, command, config) {
    let { options } = command

    if (!config || typeof config !== 'object') {
      options = optionsToObject(options)
      config = mergeConfigs(baseConfig, options)
    }

    let result = yield fn(config)

    if (result === false) {
      return result
    }

    return yield next(commandConfig, command, result)
  }
}


class Task {
  static resolve(tasksPath, task) {
    let path = resolvePath(tasksPath, task)

    try {
      let isDir = statSync(path).isDirectory()

      if (!isDir) {
        throw new Error(`${path} is not a directory`)
      }
    } catch (err) {
      err.message = `Cannot resolve task "${task}": ${err.message}`
      throw err
    }

    return path
  }

  static load(path, config = defaultConfig, name) {
    if (!config.task || !config.task.config) {
      throw new Error('Task config file must be defined')
    }

    let taskConfigPath = resolvePath(path, config.task.config)
    let taskConfig

    try {
      taskConfig = readConfig(taskConfigPath)
    } catch (err) {}

    if (taskConfig) {
      if (!name) {
        name = taskConfig.task.name
      }

      config = mergeConfigs(config, taskConfig)
    }

    if (typeof name !== 'string' || !name.length) {
      throw new Error('Task name must be a non-empty string')
    }

    let task = new Task(name, config)

    // TODO: load task handlers and hook them

    return task
  }

  constructor(name, config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Task config must be an object')
    }

    this.config = config

    let command = appache([api])(name)
    this._command = command

    // TODO: hookEnd the default handler for copying files
  }

  handle(fn) {
    if (typeof fn !== 'function') {
      throw new Error('A handler must be a function')
    }

    let handler = makeHandler(fn, this.config)
    return this._command.lifecycle.hook('handle', handler)
  }

  execute(options) {
    if (!this._started) {
      this._command.start()
    }

    return this._command.execute(options)
  }
}


module.exports = Task