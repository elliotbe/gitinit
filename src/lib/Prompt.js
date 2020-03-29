import { createInterface } from 'readline'
import { noNew, reduceStr } from '../utils.js'
import { r, g, bb, lineClear, dw, left, up, down, hideCur, showCur } from '../ansi-escape.js'

class Prompt {
  constructor(questions) {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    return this.getAnswers(questions)
  }

  write = (...args) => {
    this.rl.output.write(reduceStr(...args))
  }

  getAnswers = async (questions) => {
    const answers = {}
    for (const questionName in questions) {
      let question = questions[questionName]
      if (typeof question === 'string') {
        question = { question: question }
      }
      if (question.type === 'radio' || question.type === 'select') {
        answers[questionName] = await this.getSelect(question)
      } else {
        answers[questionName] = await this.getAnswer(question)
      }
    }
    this.rl.close()
    return answers
  }

  getAnswer = async (properties) => {
    let { question, type, prefill, validate } = {
      question: '',
      type: 'input',
      ...properties,
    }

    if (prefill) {
      question = `${question.slice(0, -1)} ${dw(`(${prefill})`)}${question.slice(-1)}`
    }

    this.question = question + ' '
    if (['password', 'hidden'].includes(type)) {
      this.rl.input.on('data', this.hideOutputHandler)
    } else {
      this.rl.input.on('data', this.outputHandler)
    }

    let answer = await this.ask(this.question)

    if (prefill && !answer) {
      answer = prefill
    }

    const errorMsg = this.validate(answer, type, validate)
    if (errorMsg) {
      return this.getAnswer({ type, ...properties, question: r(errorMsg) })
    }
    return answer
  }

  ask = (question) => {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer)
      })
    })
  }

  outputHandler = (char) => {
    if (['\n', '\r', '\u0004'].includes(char.toString())) {
      this.rl.input.removeListener('data', this.outputHandler)
      delete this.question
    } else {
      this.write(lineClear(), left(2000), this.question, bb(this.rl.line))
    }
  }

  hideOutputHandler = (char) => {
    if (['\n', '\r', '\u0004'].includes(char.toString())) {
      this.rl.history = this.rl.history.slice(1)
      this.rl.input.removeListener('data', this.hideOutputHandler)
      delete this.question
    } else {
      this.write(lineClear(), left(2000), this.question, bb('*'.repeat(this.rl.line.length)))
    }
  }

  getSelect = ({ options, ...props }) => {
    let cursorIndex = 0
    let ticked = []
    const cursor = g('>')
    const untickedChar = props.type === 'radio' ? '☐  ' : '○ '
    const tickedChar = props.type === 'radio' ? '☑  ' : '◉ '

    if (typeof props.prefill === 'string') {
      props.prefill = [props.prefill]
    }
    props.prefill.forEach((elem) => {
      const prefillIndex = options.indexOf(elem)
      prefillIndex !== -1 && ticked.push(prefillIndex)
    })

    const renderOptions = () => {
      this.rl.output = process.stdout
      options.forEach((line, index) => {
        if (index === cursorIndex) {
          this.write(cursor, ' ')
        } else {
          this.write('  ')
        }
        if (ticked.includes(index)) {
          this.write(g(tickedChar, line, '\n'))
        } else {
          this.write(untickedChar, line, '\n')
        }
      })
      this.write(up(options.length))
      this.rl.output = null
    }

    if (props.question) {
      this.write(
        props.question.slice(0, -1),
        dw(' <space to select>'),
        props.question.slice(-1),
        '\n'
      )
    }

    this.write(hideCur)
    renderOptions()

    const selectHandler = (_char, obj) => {
      if (obj.name === 'c' && obj.ctrl) {
        return console.log(down(options.length), showCur)
      }

      switch (obj.name) {
        case 'up':
          cursorIndex -= 1
          break
        case 'down':
          cursorIndex += 1
          break
        case 'space':
          if (props.type === 'radio') {
            ticked = [cursorIndex]
          }

          if (props.type === 'select') {
            ticked.includes(cursorIndex)
              ? ticked.splice(ticked.indexOf(cursorIndex), 1)
              : ticked.push(cursorIndex)
          }

          break
        case 'return': {
          let answers = ticked.sort().map((index) => options[index])
          if (props.type === 'radio') answers = answers[0]
          process.stdout.write(`${down(cursorIndex)} ${up(cursorIndex)}`)
          this.rl.emit('answers', answers)
          return
        }
      }

      if (cursorIndex < 0) {
        cursorIndex = options.length - 1
      }

      if (cursorIndex > options.length - 1) {
        cursorIndex = 0
      }

      renderOptions()
    }

    this.rl.input.on('keypress', selectHandler)

    return new Promise((resolve) => {
      this.rl.once('answers', (answers) => {
        this.rl.output = process.stdout
        this.write(down(options.length), '\n', showCur)
        this.rl.input.removeListener('keypress', selectHandler)
        resolve(answers)
      })
    })
  }

  validate = (answer, type, any) => {
    let validateCallback
    switch (typeof any) {
      case 'function': {
        validateCallback = any
        break
      }
      case 'object': {
        const options = any
        validateCallback = this.getValidateCallback(options.type || type, true, options.message)
        break
      }
      case 'string': {
        const type = any
        validateCallback = this.getValidateCallback(type, true)
        break
      }
      default: {
        validateCallback = this.getValidateCallback(type)
        break
      }
    }

    return validateCallback(answer)
  }

  getValidateCallback = (type, custom = false, errorMsg) => {
    switch (type) {
      case 'email':
        return (answer) => {
          if (!answer.match(/^\S+@\S+\.\S{2,3}$/)) {
            return errorMsg || 'Not a valid email, try again:'
          }
        }
      case 'notEmpty':
        return (answer) => {
          if (!answer.length) {
            return errorMsg || 'You need to enter something:'
          }
        }
      default: {
        if (custom) throw new Error(`No validator of type ${type}'`)
        return () => {}
      }
    }
  }
}

export default noNew(Prompt)
