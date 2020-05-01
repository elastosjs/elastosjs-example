import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Row, Col, Card, CardHeader, CardBody, Input, InputGroup, Button, ListGroup, ListGroupItem } from 'reactstrap'
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { fromConnection, ephemeral } from '@openzeppelin/network'
import { elajs } from 'ela-js'

const TESTNET_RPC = 'http://localhost:8545'
const ELAJS_DATABASE_CONTRACT_ADDRESS = '0x6E31a56B63661Fd43FFB8F6c1023D35c64Ea3FF7'
const ELA_RELAY_HUB_ADDR = '0xD216153c06E857cD7f72665E0aF1d7D82172F494'

function App() {

  const [web3, setWeb3] = useState()
  const [elajsDb, setElajsDb] = useState()
  const [todos, setTodos] = useState([])
  const [gsnBalance, setGsnBalance] = useState(0)

  /*
  ***************************************************************************
  * Create the web3 instance which connects to the blockchain and
  * the elajs instance which is our SDK to connect to our database
  ***************************************************************************
   */
  useEffect(() => {
    (async () => {
      const ephemeralWeb3 = await fromConnection(TESTNET_RPC, {
        gsn: { signKey: ephemeral() },
        pollInterval: 5000
      })

      const elajsDb = new elajs.database({
        ephemeralWeb3: ephemeralWeb3,

        // make sure this is correct
        databaseContractAddr: ELAJS_DATABASE_CONTRACT_ADDRESS,
        relayHubAddr: ELA_RELAY_HUB_ADDR
      })

      setWeb3(ephemeralWeb3)
      setElajsDb(elajsDb)
    })()
  }, [ephemeral])

  /*
  ***************************************************************************
  * This calls getGSNBalance() on elajsDb to get the balance
  ***************************************************************************
   */
  useEffect(() => {
    (async () => {
      if (!elajsDb){
        return
      }
      const gsnBalance = await elajsDb.getGSNBalance()
      setGsnBalance(gsnBalance)
    })()
  }, [elajsDb, todos])

  /*
  ***************************************************************************
  * This function calls elajs's insertRow method
  ***************************************************************************
   */
  const todoInput = useRef()

  const addTodo = useCallback(async () => {

    const todoText = todoInput.current.value

    // this will hold the new item
    const newTodo = {
      id: null,
      task: todoText
    }

    const cols = ['task', 'done']
    const vals = [todoText, false]

    const rowId = await elajsDb.insertRow('todo', cols, vals)

    newTodo.id = rowId

    todos.push(newTodo)

    // slice to ensure we have a new array
    setTodos(todos.slice())

    todoInput.current.value = ''

  }, [todoInput, web3, elajsDb, todos, setTodos])

  /*
  ***************************************************************************
  * This useEffect queries the data on load
  ***************************************************************************
   */
  useEffect(() => {
    (async () => {

      if (!elajsDb){
        return
      }

      // first get the ids
      const todoIds = await elajsDb.getTableIds('todo')

      const todos = []

      for (let i = 0, len = todoIds.length; i < len; i++){

        const id = todoIds[i]

        const result = await elajsDb.getRow('todo', id)

        const todo = {
          id
        }

        result.forEach((colData) => {
          todo[colData.name] = colData.value
        })

        todos.push(todo)
      }

      setTodos(todos)
    })()

  }, [web3, elajsDb, setTodos])

  return (
    <div className="App">
      <header className="App-header">
        {!web3 ? 'Loading' : <div>
          <Row>
            <Col>
              Contract Address: {ELAJS_DATABASE_CONTRACT_ADDRESS}
            </Col>
          </Row>
          Your GSN Balance is {web3.lib.utils.fromWei(gsnBalance.toString())} ELAETHSC

          <Card>
            <CardHeader>
              <InputGroup>
                <Input type="text" innerRef={todoInput} placeholder="my todo"/>
                <Button color="primary" onClick={addTodo}>Add Todo</Button>
              </InputGroup>
            </CardHeader>
          </Card>

          <ListGroup className="text-left">
            {todos.map((todo) => {
              return <ListGroupItem key={todo.id} style={{fontSize: '18px', color: 'black'}}>
                <Row>
                  <Col>
                    {todo.task}
                  </Col>
                  <Col>

                  </Col>
                </Row>

              </ListGroupItem>
            })}
          </ListGroup>
        </div>}
      </header>
    </div>
  );
}

export default App;
