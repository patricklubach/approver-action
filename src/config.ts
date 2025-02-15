import fs from 'fs'
import YAML from 'yaml'

import * as core from '@actions/core'

/**
 * A custom error class used to indicate invalid configuration conditions.
 *
 * @class ConfigValidationError
 */
class ConfigValidationError extends Error {
  name: string

  /**
   * Constructs a new instance of `ConfigValidationError` with the given message and optional additional arguments.
   *
   * @param {string} message - The error message to display.
   * @param {...any} args - Additional arguments to pass to the super constructor (Error).
   */
  constructor(message: string, ...args: string[]) {
    super(message, ...args)
    this.name = this.constructor.name
  }
}

/**
 * A class responsible for managing and validating configuration settings.
 *
 * @class Config
 */
class Config {
  config: any
  conditionType: string
  rules: Array<any>
  /**
   * Constructs an instance of `Config` with the specified config file path.
   * Reads and parses the configuration file, then initializes validation settings.
   *
   * @param {string} configPath - The path to the YAML configuration file to read.
   */
  constructor(configPath: string) {
    this.config = this.read(configPath)
    this.conditionType = this.config.check_on || 'branch_name'
    this.rules = this.config.rules

    // Validate configuration immediately after initialization
    this.validate()
  }

  /**
   * Reads the YAML configuration file from the specified path.
   *
   * @param {string} configPath - The path to the YAML configuration file.
   * @returns {Object} The parsed configuration data.
   * @throws {Error} If there's an issue reading or parsing the file.
   */
  read(configPath: string): any {
    core.debug(`Reading config from path ${configPath}`)
    try {
      return YAML.parse(fs.readFileSync(configPath, 'utf8'))
    } catch (error: any) {
      throw new Error('Cannot get data from config file at ${configPath}.', {
        cause: error
      })
    }
  }

  /**
   * Validates the configuration settings and throws errors if any conditions are violated.
   *
   * @throws {ConfigValidationError} If validation fails due to invalid condition type or missing rules array.
   */
  validate() {
    core.debug(`Validating config...`)
    // Check if check_on property is set correctly
    if (
      !this.conditionType ||
      (this.conditionType !== 'branch_name' && this.conditionType !== 'title')
    ) {
      throw new ConfigValidationError(
        `Invalid check_on property. Use one of: 'branch_name', 'title'. Got: ${this.conditionType}`
      )
    }
    // Ensure rules are an array
    if (!Array.isArray(this.rules)) {
      throw new ConfigValidationError(
        "Invalid rules property. 'rules' property is either not defined or empty!"
      )
    }
    core.debug(`Validation successful`)
  }
}

export { Config }
