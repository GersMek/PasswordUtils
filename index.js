/**
 * index.js
 * ---------------------------------------------------------------------------
 * "Password Game Text Toolkit" - a Gandi IDE (Modded Scratch) extension
 * purpose-built for creating Password-Game-style challenges: rules that
 * validate, transform, count, and generate text/passwords.
 *
 * ARCHITECTURE
 * This file is intentionally "thin": it contains ONLY block metadata
 * (opcode, text, argument shape, defaults, tooltips) and the wiring that
 * forwards a block call to the appropriate pure function in one of:
 *   TextUtils.js, UnicodeUtils.js, NumberUtils.js, RandomUtils.js,
 *   PasswordUtils.js, RegexUtils.js
 *
 * All actual logic/validation lives in those modules (Single Responsibility
 * Principle) so it can be unit-tested independently of the Scratch VM and
 * so the same logic can never diverge between blocks that use it.
 *
 * PERFORMANCE
 * Block methods here do the absolute minimum: coerce Scratch arguments and
 * delegate. No regex is compiled inside this file - everything reuses the
 * cached patterns from RegexUtils.js (see that file's header comment).
 * ---------------------------------------------------------------------------
 */

import * as TextUtils from './TextUtils.js';
import * as UnicodeUtils from './UnicodeUtils.js';
import * as NumberUtils from './NumberUtils.js';
import * as RandomUtils from './RandomUtils.js';
import * as PasswordUtils from './PasswordUtils.js';

/* global Scratch */

const BlockType = Scratch.BlockType;
const ArgumentType = Scratch.ArgumentType;

// ---------------------------------------------------------------------------
// Reusable menu definitions (built once, not per-block-call)
// ---------------------------------------------------------------------------

const SCRIPT_MENU = UnicodeUtils.SCRIPT_NAMES.map((name) => ({ text: name, value: name }));
const SYMBOL_BLOCK_MENU = UnicodeUtils.SYMBOL_BLOCK_NAMES.map((name) => ({
  text: name,
  value: name,
}));
const NORMALIZATION_FORM_MENU = [
  { text: 'NFC', value: 'NFC' },
  { text: 'NFD', value: 'NFD' },
  { text: 'NFKC', value: 'NFKC' },
  { text: 'NFKD', value: 'NFKD' },
];
const CHARACTER_TYPE_MENU = [
  { text: 'digit', value: 'digit' },
  { text: 'uppercase', value: 'upper' },
  { text: 'lowercase', value: 'lower' },
  { text: 'special', value: 'special' },
  { text: 'letter', value: 'letter' },
  { text: 'unicode', value: 'unicode' },
  { text: 'emoji', value: 'emoji' },
];

/**
 * Small helper factory that builds a standard "single text argument"
 * argument map, reducing duplication across the many blocks that only take
 * one string input named TEXT.
 * @param {string} defaultValue
 */
function textArg(defaultValue) {
  return { type: ArgumentType.STRING, defaultValue: defaultValue };
}

function numberArg(defaultValue) {
  return { type: ArgumentType.NUMBER, defaultValue: defaultValue };
}

class PasswordGameTextToolkit {
  constructor(runtime) {
    this.runtime = runtime;
  }

  getInfo() {
    return {
      id: 'passwordGameTextToolkit',
      name: 'Password Game Toolkit',
      color1: '#5C6BC0',
      color2: '#3F4BA0',
      color3: '#2E3878',
      blocks: [
        // ================================================================
        // TEXT CHECKS
        // ================================================================
        '---', // Category header divider (rendered as a label by Gandi/Scratch)
        this._bool('containsDigit', 'contains digit [TEXT]', { TEXT: textArg('abc123') }),
        this._bool('containsLetter', 'contains letter [TEXT]', { TEXT: textArg('abc123') }),
        this._bool('containsUppercase', 'contains uppercase [TEXT]', { TEXT: textArg('Abc') }),
        this._bool('containsLowercase', 'contains lowercase [TEXT]', { TEXT: textArg('Abc') }),
        this._bool('containsSpecialCharacter', 'contains special character [TEXT]', {
          TEXT: textArg('abc!'),
        }),
        this._bool('containsEmoji', 'contains emoji [TEXT]', { TEXT: textArg('hi 😀') }),
        this._bool('containsUnicode', 'contains unicode [TEXT]', { TEXT: textArg('café') }),
        this._bool('containsWhitespace', 'contains whitespace [TEXT]', {
          TEXT: textArg('a b'),
        }),
        this._bool('containsOnlyDigits', 'contains only digits [TEXT]', {
          TEXT: textArg('12345'),
        }),
        this._bool('containsOnlyLetters', 'contains only letters [TEXT]', {
          TEXT: textArg('abcXYZ'),
        }),
        this._bool('containsOnlyLatinLetters', 'contains only latin letters [TEXT]', {
          TEXT: textArg('abcXYZ'),
        }),
        this._bool('containsOnlyAscii', 'contains only ascii [TEXT]', { TEXT: textArg('abc') }),
        this._bool(
          'containsOnlyPrintableAscii',
          'contains only printable ascii [TEXT]',
          { TEXT: textArg('abc') }
        ),
        this._bool('startsWith', 'text [TEXT] starts with [PREFIX]', {
          TEXT: textArg('hello world'),
          PREFIX: textArg('hello'),
        }),
        this._bool('endsWith', 'text [TEXT] ends with [SUFFIX]', {
          TEXT: textArg('hello world'),
          SUFFIX: textArg('world'),
        }),
        this._bool('containsSubstring', 'text [TEXT] contains substring [SUB]', {
          TEXT: textArg('hello world'),
          SUB: textArg('lo wo'),
        }),
        this._bool(
          'containsRepeatedCharacters',
          'contains repeated characters [TEXT]',
          { TEXT: textArg('aabbcc') }
        ),
        this._bool(
          'containsDuplicateCharacters',
          'contains duplicate characters [TEXT]',
          { TEXT: textArg('abca') }
        ),
        this._bool(
          'containsConsecutiveDigits',
          'contains consecutive digits [TEXT]',
          { TEXT: textArg('a12b') }
        ),
        this._bool(
          'containsConsecutiveLetters',
          'contains consecutive letters [TEXT]',
          { TEXT: textArg('ab12') }
        ),
        this._bool('containsRomanNumerals', 'contains roman numerals [TEXT]', {
          TEXT: textArg('chapter XIV'),
        }),
        this._bool('containsHexadecimal', 'contains hexadecimal [TEXT]', {
          TEXT: textArg('1A2B'),
        }),
        this._bool('containsBinary', 'contains binary [TEXT]', { TEXT: textArg('1010') }),
        this._bool('containsOctal', 'contains octal [TEXT]', { TEXT: textArg('0o17') }),
        this._bool('containsUrl', 'contains URL [TEXT]', {
          TEXT: textArg('visit https://gandi.io'),
        }),
        this._bool('containsEmail', 'contains email [TEXT]', {
          TEXT: textArg('me@example.com'),
        }),
        this._bool(
          'matchesRegex',
          'text [TEXT] matches regex [PATTERN] flags [FLAGS]',
          {
            TEXT: textArg('hello123'),
            PATTERN: textArg('\\d+'),
            FLAGS: textArg('g'),
          }
        ),
        this._bool('isPalindrome', 'text [TEXT] is palindrome (ignore case/spaces: [IGNORE])', {
          TEXT: textArg('racecar'),
          IGNORE: { type: ArgumentType.BOOLEAN, defaultValue: true },
        }),
        this._bool('isAnagramOf', 'text [TEXT] is anagram of [OTHER]', {
          TEXT: textArg('listen'),
          OTHER: textArg('silent'),
        }),
        this._bool('isEmpty', 'text [TEXT] is empty', { TEXT: textArg('') }),
        this._bool('isPrintable', 'text [TEXT] is printable', { TEXT: textArg('hello') }),

        // ================================================================
        // TEXT COUNTING
        // ================================================================
        '---',
        this._num('letterCount', 'letter count [TEXT]', { TEXT: textArg('abc123') }),
        this._num('digitCount', 'digit count [TEXT]', { TEXT: textArg('abc123') }),
        this._num('uppercaseCount', 'uppercase count [TEXT]', { TEXT: textArg('AbC') }),
        this._num('lowercaseCount', 'lowercase count [TEXT]', { TEXT: textArg('AbC') }),
        this._num('specialCharacterCount', 'special character count [TEXT]', {
          TEXT: textArg('a!b@c#'),
        }),
        this._num('emojiCount', 'emoji count [TEXT]', { TEXT: textArg('😀😀🔥') }),
        this._num('unicodeCount', 'unicode count [TEXT]', { TEXT: textArg('café') }),
        this._num('whitespaceCount', 'whitespace count [TEXT]', { TEXT: textArg('a b c') }),
        this._num('wordCount', 'word count [TEXT]', { TEXT: textArg('hello there world') }),
        this._num('lineCount', 'line count [TEXT]', { TEXT: textArg('line1\nline2') }),
        this._num('uniqueCharacterCount', 'unique character count [TEXT]', {
          TEXT: textArg('mississippi'),
        }),
        this._num('duplicateCharacterCount', 'duplicate character count [TEXT]', {
          TEXT: textArg('mississippi'),
        }),
        this._num(
          'occurrencesOfSubstring',
          'occurrences of [SUB] in [TEXT]',
          { TEXT: textArg('abcabcabc'), SUB: textArg('abc') }
        ),
        this._num('sumOfDigits', 'sum of digits [TEXT]', { TEXT: textArg('123') }),
        this._num('productOfDigits', 'product of digits [TEXT]', { TEXT: textArg('123') }),
        this._num('averageDigit', 'average digit [TEXT]', { TEXT: textArg('123') }),
        this._num('largestDigit', 'largest digit [TEXT]', { TEXT: textArg('123') }),
        this._num('smallestDigit', 'smallest digit [TEXT]', { TEXT: textArg('123') }),
        this._reporter('mostCommonCharacter', 'most common character [TEXT]', {
          TEXT: textArg('mississippi'),
        }),
        this._reporter('leastCommonCharacter', 'least common character [TEXT]', {
          TEXT: textArg('mississippi'),
        }),

        // ================================================================
        // STRING OPERATIONS
        // ================================================================
        '---',
        this._reporter('reverse', 'reverse [TEXT]', { TEXT: textArg('hello') }),
        this._reporter('shuffle', 'shuffle [TEXT]', { TEXT: textArg('hello') }),
        this._reporter('sortCharacters', 'sort characters [TEXT]', { TEXT: textArg('hello') }),
        this._reporter('removeDuplicates', 'remove duplicates [TEXT]', {
          TEXT: textArg('mississippi'),
        }),
        this._reporter('removeWhitespace', 'remove whitespace [TEXT]', {
          TEXT: textArg('h e l l o'),
        }),
        this._reporter('keepOnlyDigits', 'keep only digits [TEXT]', {
          TEXT: textArg('a1b2c3'),
        }),
        this._reporter('keepOnlyLetters', 'keep only letters [TEXT]', {
          TEXT: textArg('a1b2c3'),
        }),
        this._reporter(
          'keepOnlySpecialCharacters',
          'keep only special characters [TEXT]',
          { TEXT: textArg('a!b@c#') }
        ),
        this._reporter(
          'replaceRegex',
          'in [TEXT] replace regex [PATTERN] flags [FLAGS] with [REPLACEMENT]',
          {
            TEXT: textArg('hello123'),
            PATTERN: textArg('\\d+'),
            FLAGS: textArg('g'),
            REPLACEMENT: textArg('#'),
          }
        ),
        this._reporter('splitRegex', 'split [TEXT] by regex [PATTERN] flags [FLAGS]', {
          TEXT: textArg('a,b,,c'),
          PATTERN: textArg(','),
          FLAGS: textArg(''),
        }),
        this._reporter('joinList', 'join list [LIST] with [SEPARATOR]', {
          LIST: textArg('a\nb\nc'),
          SEPARATOR: textArg(', '),
        }),
        this._reporter('trim', 'trim [TEXT]', { TEXT: textArg('  hello  ') }),
        this._reporter('normalizeUnicode', 'normalize unicode [TEXT] form [FORM]', {
          TEXT: textArg('café'),
          FORM: { type: ArgumentType.STRING, defaultValue: 'NFC', menu: 'normalizationForms' },
        }),

        // ================================================================
        // NUMBER UTILITIES
        // ================================================================
        '---',
        this._bool('isPrime', 'is prime [N]', { N: numberArg(7) }),
        this._bool('isFibonacci', 'is fibonacci [N]', { N: numberArg(8) }),
        this._bool('isPerfectSquare', 'is perfect square [N]', { N: numberArg(9) }),
        this._bool('isPerfectCube', 'is perfect cube [N]', { N: numberArg(27) }),
        this._bool('isEven', 'is even [N]', { N: numberArg(4) }),
        this._bool('isOdd', 'is odd [N]', { N: numberArg(3) }),
        this._num('digitalRoot', 'digital root [N]', { N: numberArg(9875) }),
        this._reporter('toRomanNumeral', 'roman numeral conversion [N]', { N: numberArg(14) }),
        this._num('romanToDecimal', 'roman to decimal [ROMAN]', { ROMAN: textArg('XIV') }),
        this._num('binaryToDecimal', 'binary to decimal [BIN]', { BIN: textArg('1010') }),
        this._reporter('decimalToBinary', 'decimal to binary [N]', { N: numberArg(10) }),
        this._reporter('decimalToHex', 'hex conversion [N]', { N: numberArg(255) }),
        this._num('hexToDecimal', 'hex to decimal [HEX]', { HEX: textArg('FF') }),

        // ================================================================
        // RANDOM
        // ================================================================
        '---',
        this._reporter('randomLetter', 'random letter', {}),
        this._reporter('randomUppercase', 'random uppercase', {}),
        this._reporter('randomLowercase', 'random lowercase', {}),
        this._reporter('randomDigit', 'random digit', {}),
        this._reporter('randomSpecialCharacter', 'random special character', {}),
        this._reporter('randomEmoji', 'random emoji', {}),
        this._reporter('randomUnicodeCharacter', 'random unicode character', {}),
        this._reporter('randomPrintableAscii', 'random printable ascii', {}),
        this._reporter('randomRomanNumeral', 'random roman numeral', {}),

        // ================================================================
        // PASSWORD HELPERS
        // ================================================================
        '---',
        this._num('passwordStrengthScore', 'password strength score [TEXT]', {
          TEXT: textArg('Hunter2!'),
        }),
        this._num('passwordEntropy', 'password entropy [TEXT]', { TEXT: textArg('Hunter2!') }),
        this._reporter('estimatedCrackTime', 'estimated crack time [TEXT]', {
          TEXT: textArg('Hunter2!'),
        }),
        this._bool(
          'containsAllRequiredCharacterTypes',
          'text [TEXT] contains all required types [TYPES]',
          { TEXT: textArg('Abc123!'), TYPES: textArg('digit,upper,lower,special') }
        ),
        this._bool('containsMinimumDigits', 'text [TEXT] contains minimum [N] digits', {
          TEXT: textArg('abc123'),
          N: numberArg(2),
        }),
        this._bool('containsMinimumLetters', 'text [TEXT] contains minimum [N] letters', {
          TEXT: textArg('abc123'),
          N: numberArg(2),
        }),
        this._bool(
          'containsMinimumUppercase',
          'text [TEXT] contains minimum [N] uppercase',
          { TEXT: textArg('AbC123'), N: numberArg(1) }
        ),
        this._bool(
          'containsMinimumLowercase',
          'text [TEXT] contains minimum [N] lowercase',
          { TEXT: textArg('AbC123'), N: numberArg(1) }
        ),
        this._bool(
          'containsMinimumSpecialCharacters',
          'text [TEXT] contains minimum [N] special characters',
          { TEXT: textArg('a!b@c#'), N: numberArg(2) }
        ),
        this._bool('containsExactlyDigits', 'text [TEXT] contains exactly [N] digits', {
          TEXT: textArg('a1b2'),
          N: numberArg(2),
        }),
        this._bool('containsExactlyLetters', 'text [TEXT] contains exactly [N] letters', {
          TEXT: textArg('a1b2'),
          N: numberArg(2),
        }),
        this._bool(
          'containsExactlyOccurrencesOfSubstring',
          'text [TEXT] contains exactly [N] occurrences of [SUB]',
          { TEXT: textArg('abcabc'), SUB: textArg('abc'), N: numberArg(2) }
        ),

        // ================================================================
        // UNICODE (script / symbol block detection)
        // ================================================================
        '---',
        this._boolMenu(
          'containsScript',
          'text [TEXT] contains [SCRIPT] characters',
          'TEXT',
          textArg('Ελληνικά'),
          'SCRIPT',
          'scripts',
          'Greek'
        ),
        this._boolMenu(
          'containsSymbolBlock',
          'text [TEXT] contains [BLOCK] symbols',
          'TEXT',
          textArg('→ ← ↑'),
          'BLOCK',
          'symbolBlocks',
          'Arrows'
        ),
      ],
      menus: {
        scripts: { acceptReporters: true, items: SCRIPT_MENU },
        symbolBlocks: { acceptReporters: true, items: SYMBOL_BLOCK_MENU },
        normalizationForms: { acceptReporters: true, items: NORMALIZATION_FORM_MENU },
        characterTypes: { acceptReporters: true, items: CHARACTER_TYPE_MENU },
      },
    };
  }

  // ---------------------------------------------------------------------
  // Block-definition factory helpers (keep the getInfo() list declarative
  // and free of repeated boilerplate - Open/Closed friendly: new block
  // "shapes" can be added here without touching existing entries).
  // ---------------------------------------------------------------------

  _bool(opcode, text, argsMap) {
    return {
      opcode,
      blockType: BlockType.BOOLEAN,
      text,
      arguments: argsMap,
    };
  }

  _num(opcode, text, argsMap) {
    return {
      opcode,
      blockType: BlockType.REPORTER,
      text,
      arguments: argsMap,
    };
  }

  _reporter(opcode, text, argsMap) {
    return {
      opcode,
      blockType: BlockType.REPORTER,
      text,
      arguments: argsMap,
    };
  }

  _boolMenu(opcode, text, textArgName, textArgDef, menuArgName, menuName, menuDefault) {
    const args = {};
    args[textArgName] = textArgDef;
    args[menuArgName] = {
      type: ArgumentType.STRING,
      defaultValue: menuDefault,
      menu: menuName,
    };
    return { opcode, blockType: BlockType.BOOLEAN, text, arguments: args };
  }

  // =======================================================================
  // BLOCK IMPLEMENTATIONS - thin delegation layer to the utility modules.
  // Argument objects are destructured directly; every value is coerced by
  // the target utility function, so no additional validation is needed here.
  // =======================================================================

  // --- TEXT CHECKS -------------------------------------------------------
  containsDigit(args) { return TextUtils.containsDigit(args.TEXT); }
  containsLetter(args) { return TextUtils.containsLetter(args.TEXT); }
  containsUppercase(args) { return TextUtils.containsUppercase(args.TEXT); }
  containsLowercase(args) { return TextUtils.containsLowercase(args.TEXT); }
  containsSpecialCharacter(args) { return TextUtils.containsSpecialCharacter(args.TEXT); }
  containsEmoji(args) { return TextUtils.containsEmoji(args.TEXT); }
  containsUnicode(args) { return TextUtils.containsUnicode(args.TEXT); }
  containsWhitespace(args) { return TextUtils.containsWhitespace(args.TEXT); }
  containsOnlyDigits(args) { return TextUtils.containsOnlyDigits(args.TEXT); }
  containsOnlyLetters(args) { return TextUtils.containsOnlyLetters(args.TEXT); }
  containsOnlyLatinLetters(args) { return TextUtils.containsOnlyLatinLetters(args.TEXT); }
  containsOnlyAscii(args) { return TextUtils.containsOnlyAscii(args.TEXT); }
  containsOnlyPrintableAscii(args) { return TextUtils.containsOnlyPrintableAscii(args.TEXT); }
  startsWith(args) { return TextUtils.startsWith(args.TEXT, args.PREFIX); }
  endsWith(args) { return TextUtils.endsWith(args.TEXT, args.SUFFIX); }
  containsSubstring(args) { return TextUtils.containsSubstring(args.TEXT, args.SUB); }
  containsRepeatedCharacters(args) { return TextUtils.containsRepeatedCharacters(args.TEXT); }
  containsDuplicateCharacters(args) { return TextUtils.containsDuplicateCharacters(args.TEXT); }
  containsConsecutiveDigits(args) { return TextUtils.containsConsecutiveDigits(args.TEXT); }
  containsConsecutiveLetters(args) { return TextUtils.containsConsecutiveLetters(args.TEXT); }
  containsRomanNumerals(args) { return TextUtils.containsRomanNumerals(args.TEXT); }
  containsHexadecimal(args) { return TextUtils.containsHexadecimal(args.TEXT); }
  containsBinary(args) { return TextUtils.containsBinary(args.TEXT); }
  containsOctal(args) { return TextUtils.containsOctal(args.TEXT); }
  containsUrl(args) { return TextUtils.containsUrl(args.TEXT); }
  containsEmail(args) { return TextUtils.containsEmail(args.TEXT); }
  matchesRegex(args) { return TextUtils.matchesRegex(args.TEXT, args.PATTERN, args.FLAGS); }
  isPalindrome(args) { return TextUtils.isPalindrome(args.TEXT, args.IGNORE); }
  isAnagramOf(args) { return TextUtils.isAnagramOf(args.TEXT, args.OTHER); }
  isEmpty(args) { return TextUtils.isEmpty(args.TEXT); }
  isPrintable(args) { return TextUtils.isPrintable(args.TEXT); }

  // --- TEXT COUNTING -------------------------------------------------------
  letterCount(args) { return TextUtils.letterCount(args.TEXT); }
  digitCount(args) { return TextUtils.digitCount(args.TEXT); }
  uppercaseCount(args) { return TextUtils.uppercaseCount(args.TEXT); }
  lowercaseCount(args) { return TextUtils.lowercaseCount(args.TEXT); }
  specialCharacterCount(args) { return TextUtils.specialCharacterCount(args.TEXT); }
  emojiCount(args) { return TextUtils.emojiCount(args.TEXT); }
  unicodeCount(args) { return TextUtils.unicodeCount(args.TEXT); }
  whitespaceCount(args) { return TextUtils.whitespaceCount(args.TEXT); }
  wordCount(args) { return TextUtils.wordCount(args.TEXT); }
  lineCount(args) { return TextUtils.lineCount(args.TEXT); }
  uniqueCharacterCount(args) { return TextUtils.uniqueCharacterCount(args.TEXT); }
  duplicateCharacterCount(args) { return TextUtils.duplicateCharacterCount(args.TEXT); }
  occurrencesOfSubstring(args) { return TextUtils.occurrencesOfSubstring(args.TEXT, args.SUB); }
  sumOfDigits(args) { return TextUtils.sumOfDigits(args.TEXT); }
  productOfDigits(args) { return TextUtils.productOfDigits(args.TEXT); }
  averageDigit(args) { return TextUtils.averageDigit(args.TEXT); }
  largestDigit(args) { return TextUtils.largestDigit(args.TEXT); }
  smallestDigit(args) { return TextUtils.smallestDigit(args.TEXT); }
  mostCommonCharacter(args) { return TextUtils.mostCommonCharacter(args.TEXT); }
  leastCommonCharacter(args) { return TextUtils.leastCommonCharacter(args.TEXT); }

  // --- STRING OPERATIONS -----------------------------------------------
  reverse(args) { return TextUtils.reverse(args.TEXT); }
  shuffle(args) { return TextUtils.shuffle(args.TEXT); }
  sortCharacters(args) { return TextUtils.sortCharacters(args.TEXT); }
  removeDuplicates(args) { return TextUtils.removeDuplicates(args.TEXT); }
  removeWhitespace(args) { return TextUtils.removeWhitespace(args.TEXT); }
  keepOnlyDigits(args) { return TextUtils.keepOnlyDigits(args.TEXT); }
  keepOnlyLetters(args) { return TextUtils.keepOnlyLetters(args.TEXT); }
  keepOnlySpecialCharacters(args) { return TextUtils.keepOnlySpecialCharacters(args.TEXT); }
  replaceRegex(args) {
    return TextUtils.replaceRegex(args.TEXT, args.PATTERN, args.FLAGS, args.REPLACEMENT);
  }
  splitRegex(args) { return TextUtils.splitRegex(args.TEXT, args.PATTERN, args.FLAGS); }
  joinList(args) { return TextUtils.joinList(args.LIST, args.SEPARATOR); }
  trim(args) { return TextUtils.trim(args.TEXT); }
  normalizeUnicode(args) { return TextUtils.normalizeUnicode(args.TEXT, args.FORM); }

  // --- NUMBER UTILITIES ---------------------------------------------------
  isPrime(args) { return NumberUtils.isPrime(args.N); }
  isFibonacci(args) { return NumberUtils.isFibonacci(args.N); }
  isPerfectSquare(args) { return NumberUtils.isPerfectSquare(args.N); }
  isPerfectCube(args) { return NumberUtils.isPerfectCube(args.N); }
  isEven(args) { return NumberUtils.isEven(args.N); }
  isOdd(args) { return NumberUtils.isOdd(args.N); }
  digitalRoot(args) { return NumberUtils.digitalRoot(args.N); }
  toRomanNumeral(args) { return NumberUtils.toRomanNumeral(args.N); }
  romanToDecimal(args) { return NumberUtils.romanToDecimal(args.ROMAN); }
  binaryToDecimal(args) { return NumberUtils.binaryToDecimal(args.BIN); }
  decimalToBinary(args) { return NumberUtils.decimalToBinary(args.N); }
  decimalToHex(args) { return NumberUtils.decimalToHex(args.N); }
  hexToDecimal(args) { return NumberUtils.hexToDecimal(args.HEX); }

  // --- RANDOM ------------------------------------------------------------
  randomLetter() { return RandomUtils.randomLetter(); }
  randomUppercase() { return RandomUtils.randomUppercase(); }
  randomLowercase() { return RandomUtils.randomLowercase(); }
  randomDigit() { return RandomUtils.randomDigit(); }
  randomSpecialCharacter() { return RandomUtils.randomSpecialCharacter(); }
  randomEmoji() { return RandomUtils.randomEmoji(); }
  randomUnicodeCharacter() { return RandomUtils.randomUnicodeCharacter(); }
  randomPrintableAscii() { return RandomUtils.randomPrintableAscii(); }
  randomRomanNumeral() { return RandomUtils.randomRomanNumeral(); }

  // --- PASSWORD HELPERS ----------------------------------------------------
  passwordStrengthScore(args) { return PasswordUtils.passwordStrengthScore(args.TEXT); }
  passwordEntropy(args) { return PasswordUtils.passwordEntropy(args.TEXT); }
  estimatedCrackTime(args) { return PasswordUtils.estimatedCrackTime(args.TEXT); }
  containsAllRequiredCharacterTypes(args) {
    return PasswordUtils.containsAllRequiredCharacterTypes(args.TEXT, args.TYPES);
  }
  containsMinimumDigits(args) { return PasswordUtils.containsMinimumDigits(args.TEXT, args.N); }
  containsMinimumLetters(args) { return PasswordUtils.containsMinimumLetters(args.TEXT, args.N); }
  containsMinimumUppercase(args) {
    return PasswordUtils.containsMinimumUppercase(args.TEXT, args.N);
  }
  containsMinimumLowercase(args) {
    return PasswordUtils.containsMinimumLowercase(args.TEXT, args.N);
  }
  containsMinimumSpecialCharacters(args) {
    return PasswordUtils.containsMinimumSpecialCharacters(args.TEXT, args.N);
  }
  containsExactlyDigits(args) { return PasswordUtils.containsExactlyDigits(args.TEXT, args.N); }
  containsExactlyLetters(args) { return PasswordUtils.containsExactlyLetters(args.TEXT, args.N); }
  containsExactlyOccurrencesOfSubstring(args) {
    return PasswordUtils.containsExactlyOccurrencesOfSubstring(args.TEXT, args.SUB, args.N);
  }

  // --- UNICODE (scripts / symbol blocks) ----------------------------------
  containsScript(args) { return UnicodeUtils.containsScript(args.TEXT, args.SCRIPT); }
  containsSymbolBlock(args) { return UnicodeUtils.containsSymbolBlock(args.TEXT, args.BLOCK); }
}

Scratch.extensions.register(new PasswordGameTextToolkit());
