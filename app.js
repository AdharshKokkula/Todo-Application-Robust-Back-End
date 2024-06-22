const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const {format, isValid} = require('date-fns')

const app = express()
app.use(express.json())

const dbpath = path.join(__dirname, 'todoApplication.db')
let database = null

const initializeDataBaseAndServer = async () => {
  try {
    database = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('\n server is running at http://localhost:3000 \n')
    })
  } catch (e) {
    console.log(e)
  }
}

initializeDataBaseAndServer()

function validateDetails(priority, status, category) {
  if (
    priority !== '' &&
    priority !== 'HIGH' &&
    priority !== 'MEDIUM' &&
    priority !== 'LOW' &&
    priority !== undefined
  ) {
    return 'Invalid Todo Priority'
  } else if (
    status !== '' &&
    status !== 'TO DO' &&
    status !== 'IN PROGRESS' &&
    status !== 'DONE' &&
    status !== undefined
  ) {
    return 'Invalid Todo Status'
  } else if (
    category !== '' &&
    category !== 'WORK' &&
    category !== 'HOME' &&
    category !== 'LEARNING' &&
    category !== undefined
  ) {
    return 'Invalid Todo Category'
  } else {
    return 'true'
  }
}

function validateDate(dueDate) {
  if (isValid(new Date(dueDate))) {
    return 'true'
  } else {
    return 'Invalid Due Date'
  }
}

const changeNotationOfToDoObj = obj => ({
  id: obj.id,
  todo: obj.todo,
  priority: obj.priority,
  status: obj.status,
  category: obj.category,
  dueDate: obj.due_date,
})

const changeNotationOfToDoList = list => {
  let newList = []
  for (let obj of list) {
    newList.push(changeNotationOfToDoObj(obj))
  }
  return newList
}

app.get('/todos/', async (request, response) => {
  const {
    search_q = '',
    status = '',
    priority = '',
    category = '',
  } = request.query
  const lengthOfQuery = Object.keys(request.query).length
  let sqlGetQuery = null
  const validationResult = validateDetails(priority, status, category)
  if (validationResult === 'true') {
    if (search_q === '') {
      if (lengthOfQuery === 2) {
        sqlGetQuery = `
        select * from todo
        where
        (priority = '${priority}' and status = '${status}') or
        (status = '${status}' and category = '${category}') or
        (category = '${category}' and priority = '${priority}')
        ;`
      } else {
        sqlGetQuery = `
        select * from todo
        where
        priority = '${priority}' or 
        status = '${status}' or
        category = '${category}' 
        ;`
      }
    } else {
      sqlGetQuery = `
      select * from todo
        where 
        todo like '%${search_q}%';
      `
    }
    const results = await database.all(sqlGetQuery)
    response.send(changeNotationOfToDoList(results))
  } else {
    response.status(400)
    response.send(validationResult)
  }
})

app.get('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const sqlGetQuery = `
  SELECT * FROM todo
  WHERE
  id = ${todoId};
  `
  const results = await database.get(sqlGetQuery)
  response.send(changeNotationOfToDoObj(results))
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const isValidDate = validateDate(date)
  if (isValidDate === 'true') {
    const modifiedDate = format(new Date(date), 'yyyy-MM-dd')
    const sqlGetQuery = `SELECT * from todo WHERE due_date = '${modifiedDate}';`
    const results = await database.all(sqlGetQuery)
    response.status(200)
    response.send(changeNotationOfToDoList(results))
  } else {
    response.status(400)
    response.send(isValidDate)
  }
})

app.post('/todos', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  const validationResult = validateDetails(priority, status, category)
  const isValidDate = validateDate(dueDate)
  if (validationResult !== 'true') {
    response.status(400)
    response.send(validationResult)
  } else if (isValidDate !== 'true') {
    response.status(400)
    response.send(isValidDate)
  } else {
    const modifiedDate = format(new Date(dueDate), 'yyyy-MM-dd')
    const sqlInsertQuery = `INSERT INTO todo
      VALUES
      (${id},
      '${todo}',
      '${priority}',
      '${status}',
      '${category}',
      '${modifiedDate}');`
    await database.run(sqlInsertQuery)
    response.send('Todo Successfully Added')
  }
})

app.put('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const {status, priority, todo, category, dueDate} = request.body
  const validationResult = validateDetails(priority, status, category)
  if (validationResult !== 'true') {
    response.status(400)
    response.send(validationResult)
  } else {
    if (status !== undefined) {
      const sqlUpdateQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId}`
      await database.run(sqlUpdateQuery)
      response.status(200)
      response.send('Status Updated')
    } else if (priority !== undefined) {
      const sqlUpdateQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId}`
      await database.run(sqlUpdateQuery)
      response.status(200)
      response.send('Priority Updated')
    } else if (todo !== undefined) {
      const sqlUpdateQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId}`
      await database.run(sqlUpdateQuery)
      response.status(200)
      response.send('Todo Updated')
    } else if (category !== undefined) {
      const sqlUpdateQuery = `UPDATE todo SET category = '${category}' WHERE id = ${todoId}`
      await database.run(sqlUpdateQuery)
      response.status(200)
      response.send('Category Updated')
    } else if (dueDate !== undefined) {
      const isValidDate = validateDate(dueDate)
      if (isValidDate !== 'true') {
        response.status(400)
        response.send(isValidDate)
      } else {
        const sqlUpdateQuery = `UPDATE todo SET due_date = '${dueDate}' WHERE id = ${todoId}`
        await database.run(sqlUpdateQuery)
        response.status(200)
        response.send('Due Date Updated')
      }
    }
  }
})

app.delete('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const sqlDeleteQuery = `DELETE FROM todo WHERE id = ${todoId};`
  await database.run(sqlDeleteQuery)
  response.send('Todo Deleted')
})

module.exports = app
