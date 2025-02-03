import fs from 'fs'
import YAML from 'yaml'

import * as core from '@actions/core'

class ConfigValidationError extends Error {
  constructor(message, ...args) {
    super(message, ...args)
    this.name = this.constructor.name
  }
}

class Config {
  constructor(configPath) {
    this.config = this.read(configPath)
    this.conditionType = this.config.check_on || 'branch_name'
    this.rules = this.config.rules

    this.validate()
  }

  read(configPath) {
    core.debug(`Reading config from path ${configPath}`)
    try {
      return YAML.parse(fs.readFileSync(configPath, 'utf8'))
    } catch (error) {
      throw new Error('Cannot get data from config file at ${configPath}.', {
        cause: error
      })
    }
  }

  validate() {
    core.debug(`Validating config...`)
    if (
      !this.conditionType ||
      (this.conditionType !== 'branch_name' && this.conditionType !== 'title')
    ) {
      throw new ConfigValidationError(
        `Invalid check_on property. Use one of: 'branch_name', 'title'. Got: ${this.conditionType}`
      )
    }
    if (!Array.isArray(this.rules)) {
      throw new ConfigValidationError(
        "Invalid rules property. 'rules' property is either not defined or empty!"
      )
    }
    core.debug(`Validation successful`)
  }
}

export { Config }
