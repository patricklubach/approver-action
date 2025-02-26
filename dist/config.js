"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const yaml_1 = __importDefault(require("yaml"));
const core = __importStar(require("@actions/core"));
/**
 * A custom error class used to indicate invalid configuration conditions.
 *
 * @class ConfigValidationError
 */
class ConfigValidationError extends Error {
    name;
    /**
     * Constructs a new instance of `ConfigValidationError` with the given message and optional additional arguments.
     *
     * @param message - The error message to display.
     * @param args - Additional arguments to pass to the super constructor (Error).
     */
    constructor(message, ...args) {
        super(message);
        this.name = this.constructor.name;
    }
}
/**
 * A class responsible for managing and validating configuration settings.
 *
 * @class Config
 * @param {string} configPath - The path to the YAML configuration file to read.
 */
class Config {
    config;
    conditionType;
    rules;
    constructor(configPath) {
        this.config = this.read(configPath);
        this.conditionType = this.config.check_on || 'branch_name';
        this.rules = this.config.rules;
        // Validate configuration immediately after initialization
        this.validate();
    }
    /**
     * Reads the YAML configuration file from the specified path.
     *
     * @param {string} configPath - The path to the YAML configuration file.
     * @returns {Object} The parsed configuration data.
     * @throws {Error} If there's an issue reading or parsing the file.
     */
    read(configPath) {
        core.debug(`Reading config from path ${configPath}`);
        try {
            return yaml_1.default.parse(node_fs_1.default.readFileSync(configPath, 'utf8'));
        }
        catch (error) {
            throw new Error('Cannot get data from config file at ${configPath}.');
        }
    }
    /**
     * Validates the configuration settings and throws errors if any conditions are violated.
     *
     * @throws {ConfigValidationError} If validation fails due to invalid condition type or missing rules array.
     */
    validate() {
        core.debug(`Validating config...`);
        // Check if check_on property is set correctly
        if (!this.conditionType ||
            (this.conditionType !== 'branch_name' && this.conditionType !== 'title')) {
            throw new ConfigValidationError(`Invalid check_on property. Use one of: 'branch_name', 'title'. Got: ${this.conditionType}`);
        }
        // Ensure rules are an array
        if (!Array.isArray(this.rules)) {
            throw new ConfigValidationError("Invalid rules property. 'rules' property is either not defined or empty!");
        }
        core.debug(`Validation successful`);
    }
}
exports.Config = Config;
