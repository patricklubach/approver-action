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
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputs = exports.Inputs = void 0;
const core = __importStar(require("@actions/core"));
/**
 * Manages input configuration for the review system.
 *
 * @class Inputs
 */
class Inputs {
    configPath;
    prNumber;
    setReviewers;
    token;
    /**
     * Constructs an instance of `Inputs` to manage configuration parameters.
     * Reads inputs from command line arguments or defaults if not provided.
     */
    constructor() {
        this.configPath = core.getInput('reviewers_file', { required: false });
        this.prNumber = core.getInput('pr_number', { required: true });
        this.setReviewers =
            core.getInput('set_reviewers', { required: false }) || 'false';
        this.token = core.getInput('token', { required: true });
        this.#printDebug();
    }
    /**
     * Prints debug information about the current input configuration.
     *
     * @private
     */
    #printDebug() {
        core.debug('Inputs:');
        core.debug(`reviewers_file: ${this.configPath}`);
        core.debug(`pr_number: ${this.prNumber}`);
        core.debug(`set_reviewers: ${this.setReviewers}`);
    }
}
exports.Inputs = Inputs;
exports.inputs = new Inputs();
