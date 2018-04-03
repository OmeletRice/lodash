import baseIndexOf from './baseIndexOf.js'

/**
 * A specialized version of `includes` for arrays without support for
 * specifying an index to search from.
 * 一个特别的版本 `includes` 给不支持通过index进行索引的数组
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludes(array, value) {
  const length = array == null ? 0 : array.length
  return !!length && baseIndexOf(array, value, 0) > -1
}

export default arrayIncludes
