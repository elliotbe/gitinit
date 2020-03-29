import { join, dirname } from 'path'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { directoryExist, noNew } from '../utils.js'

class ConfigStore {
  constructor(filePath) {
    this.filePath = join(process.env.HOME, '.config', filePath)
    this.read()
  }

  write = (config = {}) => {
    const data = Object.entries(config).reduce((data, [key, value]) => {
      this[key] = value
      return data + `${key}=${value}\n`
    }, '')

    if (!directoryExist(dirname(this.filePath))) {
      mkdirSync(dirname(this.filePath), { recursive: true })
    }
    writeFileSync(this.filePath, data)
    return this
  }

  read = () => {
    if (existsSync(this.filePath)) {
      const data = readFileSync(this.filePath, 'utf8')
      const config = {}
      data
        .split('\n')
        .slice(0, -1)
        .forEach((configLine) => {
          const [key, value] = configLine.split('=')
          config[key] = value
          this[key] = value
        })

      return config
    }
    return {}
  }
}

export default noNew(ConfigStore)
