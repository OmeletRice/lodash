import isObject from './isObject.js'
import root from './.internal/root.js'

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked, or until the next browser frame is drawn. The debounced function
 * comes with a `cancel` method to cancel delayed `func` invocations and a
 * `flush` method to immediately invoke them. Provide `options` to indicate
 * whether `func` should be invoked on the leading and/or trailing edge of the
 * `wait` timeout. The `func` is invoked with the last arguments provided to the
 * debounced function. Subsequent calls to the debounced function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * If `wait` is omitted in an environment with `requestAnimationFrame`, `func`
 * invocation will be deferred until the next frame is drawn (typically about
 * 16ms).
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `debounce` and `throttle`.
 *
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0]
 *  The number of milliseconds to delay; if omitted, `requestAnimationFrame` is
 *  used (if available).
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', debounce(calculateLayout, 150))
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }))
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * const debounced = debounce(batchLog, 250, { 'maxWait': 1000 })
 * const source = new EventSource('/stream')
 * jQuery(source).on('message', debounced)
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel)
 *
 * // Check for pending invocations.
 * const status = debounced.pending() ? "Pending..." : "Ready"
 */
function debounce(func, wait, options) {
  let lastArgs,
    lastThis,
    maxWait,
    result,
    timerId,
    lastCallTime

  // 初始化参数
  let lastInvokeTime = 0  // func 最近一次执行时间
  let leading = false
  let maxing = false
  let trailing = true

  // Bypass `requestAnimationFrame` by explicitly setting `wait=0`.
  // 设置 `wait=0` 绕开 RAF
  const useRAF = (!wait && wait !== 0 && typeof root.requestAnimationFrame === 'function')

  // 检测类型
  if (typeof func != 'function') {
    throw new TypeError('Expected a function')
  }
  wait = +wait || 0
  if (isObject(options)) {
    leading = !!options.leading
    maxing = 'maxWait' in options  // 判断是否有 `maxWait` 参数
    maxWait = maxing ? Math.max(+options.maxWait || 0, wait) : maxWait
    trailing = 'trailing' in options ? !!options.trailing : trailing
  }

  // 调用 Func
  function invokeFunc(time) {
    const args = lastArgs
    const thisArg = lastThis

    lastArgs = lastThis = undefined  // 调用 invokeFunc 会清除 lastArg 和 lastThis
    lastInvokeTime = time
    result = func.apply(thisArg, args)
    return result // 返回调用函数值
  }

  function startTimer(pendingFunc, wait) {
    if (useRAF) {
      return root.requestAnimationFrame(pendingFunc)
    }
    return setTimeout(pendingFunc, wait)
  }

  function cancelTimer(id) {
    if (useRAF) {
      return root.cancelAnimationFrame(id)
    }
    clearTimeout(id)
  }

  // 前缘方法
  function leadingEdge(time) {
    // Reset any `maxWait` timer.  重置由上一次 maxing 产生的 lastInvokeTime 的变化
    lastInvokeTime = time
    // Start the timer for the trailing edge.  为触发 trailing edge 设置定时器
    timerId = startTimer(timerExpired, wait)
    // Invoke the leading edge.  前缘触发执行 func
    return leading ? invokeFunc(time) : result
  }

  // 计算 wait 时间
  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime // 距离上一次 debounced 函数被调用的时间
    const timeSinceLastInvoke = time - lastInvokeTime  //距离上一次 func 函数被执行的时间
    const timeWaiting = wait - timeSinceLastCall // 用 wait 减去 timeSinceLastCall 计算出下一次 trailing 的时间

    // maxWait - timeSinceLastInvoke 最大等待时间 - 距离上次 func 函数执行时间 
    // maxing = true => 比较 下一次 trailing 时间 和 下一次 maxing 时间 的小值
    // maxing = false => 下一次 trailing 时间
    return maxing
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting
  }

  // 判断 func 能否被执行
  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined  // 首次
        || (timeSinceLastCall >= wait)  // 距离上次 debounced 被调用 是否 大于 wait 时间
        || (timeSinceLastCall < 0)  // 系统时间倒退
        || (maxing && timeSinceLastInvoke >= maxWait)) // 有 maxTime， 是否超过最大等待时间
  }

  function timerExpired() {
    const time = Date.now()
    // 在 后缘状态，并能够执行 func 条件下， 调用 trailingEdge 函数
    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }
    // Restart the timer.  重启 定时器，计算 wait 时间
    timerId = startTimer(timerExpired, remainingWait(time))
  }

  function trailingEdge(time) {
    timerId = undefined

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    // 有 lastArgs 才执行，意味着只有 func 已经被 debounced 过一次之后 才能在 后缘执行
    if (trailing && lastArgs) {
      return invokeFunc(time)
    }
    // 每次后缘执行都会清除 lastArgs 和 lastThis，目的是避免 最后一次函数被执行两次
    lastArgs = lastThis = undefined
    return result
  }

  function cancel() {
    if (timerId !== undefined) {
      cancelTimer(timerId)
    }
    lastInvokeTime = 0
    lastArgs = lastCallTime = lastThis = timerId = undefined
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now())
  }

  function pending() {
    return timerId !== undefined
  }

  function debounced(...args) {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime)
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = startTimer(timerExpired, wait)
        return invokeFunc(lastCallTime)
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, wait)
    }
    return result
  }
  debounced.cancel = cancel
  debounced.flush = flush
  debounced.pending = pending
  return debounced
}

export default debounce
