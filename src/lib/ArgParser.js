import { up, lineClear, r } from '../ansi-escape.js'
import { helpFile } from '../utils.js'

class ArgParser {
  constructor(config) {
    this.config = { flag: {}, ...config }
    return this.parse(this.config)
  }

  parse = (config) => {
    const allArgvList = process.argv.slice(2)
    const allConfigFlag = Object.entries(config.flag).reduce((array, [key, value]) => {
      array.push(key)
      if (value) array.push(...value)
      return array
    }, [])

    try {
      const flagList = allArgvList
        .filter((arg) => arg.startsWith('-'))
        .reduce((array, flag) => {
          let trimmed
          if (/^-[^-]/.test(flag)) {
            trimmed = flag.slice(1).split('')
          } else {
            trimmed = [flag.slice(2)]
          }
          trimmed.forEach((flag) => {
            if (!allConfigFlag.includes(flag)) {
              throw new Error(`Unknow flag '${flag.length > 1 ? `--${flag}` : `-${flag}`}'`)
            }
          })

          return [...array, ...trimmed]
        }, [])

      const fillFlag = Object.entries(config.flag).reduce((obj, [key, value]) => {
        const flagLine = [key, ...value]
        obj[key] = flagLine
          .map((flag) => flagList.includes(flag))
          .reduce((init, bool) => init || bool, false)
        return obj
      }, {})

      config.flag = fillFlag

      const argvList = allArgvList.filter((arg) => !arg.startsWith('-'))
      if (argvList.length > Object.keys(config).length - 1) {
        throw new Error(`Too many arguments: ${argvList.map((arg) => `'${arg}'`).join(' ')}`)
      }

      const fillConfig = Object.keys(config)
        .filter((key) => key !== 'flag')
        .reduce((obj, key) => {
          obj[key] = argvList.shift(argvList)
          return obj
        }, {})

      return { flag: fillFlag, ...fillConfig }
    } catch (error) {
      console.error(`${up()}${lineClear()}\n${r(error.message)}`)
      if (allConfigFlag.includes('help')) {
        console.log(helpFile)
      }

      process.exit(1)
    }
  }
}

export default ArgParser
