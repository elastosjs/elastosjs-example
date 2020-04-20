import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Row, Col, Card, CardHeader, CardBody, Input, InputGroup, Button, ListGroup, ListGroupItem } from 'reactstrap'
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { fromConnection, ephemeral } from '@openzeppelin/network'
import { ELA_JS } from 'ela-js'

const TESTNET_RPC = 'http://localhost:8545'
const ELAJS_DATABASE_CONTRACT_ADDRESS = '0x98F1328BB668C7A4103c9140CfFC753caEc66ee4'

function App() {

  const [web3, setWeb3] = useState()
  const [elajs, setElajs] = useState()
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

      const newElajs = new ELA_JS({
        ephemeralWeb3: ephemeralWeb3,

        // make sure this is correct
        contractAddress: ELAJS_DATABASE_CONTRACT_ADDRESS
      })

      setWeb3(ephemeralWeb3)
      setElajs(newElajs)
    })()
  }, [ephemeral])

  /*
  ***************************************************************************
  * This calls getGSNBalance() on elajs to get the balance
  ***************************************************************************
   */
  useEffect(() => {
    (async () => {
      if (!elajs){
        return
      }
      const gsnBalance = await elajs.getGSNBalance()
      setGsnBalance(gsnBalance)
    })()
  }, [elajs, todos])

  /*
  ***************************************************************************
  * This function calls elajs's insertVal method
  ***************************************************************************
   */
  const todoInput = useRef()

  const addTodo = useCallback(async () => {

    const todoText = todoInput.current.value

    const newTodo = {
      id: null,
      text: todoText,
      transactionHash: null
    }

    const todoBytes32 = web3.lib.utils.stringToHex(todoText)

    const insertPromise = elajs.insertVal('todos', 'todo', todoBytes32)

    insertPromise.on('transactionHash', (hash) => {
      newTodo.transactionHash = hash
    })

    await insertPromise

    todos.push(newTodo)

    setTodos(todos.slice())

    todoInput.current.value = ''

  }, [todoInput, web3, elajs, todos, setTodos])

  /*
  ***************************************************************************
  * This useEffect queries the data on load
  * TODO: create a better elajs function for this
  ***************************************************************************
   */
  useEffect(() => {
    (async () => {

      if (!elajs){
        return
      }

      // first get the ids
      const todoIds = await elajs.getTableIds('todos')

      const todos = []

      for (let i = 0, len = todoIds.length; i < len; i++){

        const id = todoIds[i]

        const result = await elajs._getVal('todos', id, 'todo')

        todos.push({
          id,
          text: web3.lib.utils.hexToString(result)
        })
      }

      setTodos(todos)
    })()

  }, [web3, elajs, setTodos])

  return (
    <div className="App">
      <header className="App-header">
        {!web3 ? 'Loading' : <div>
          <Row>
            <Col>
              Contract Address: {ELAJS_DATABASE_CONTRACT_ADDRESS}
            </Col>
          </Row>
          Your GSN Balance is {web3.lib.utils.fromWei(gsnBalance.toString())} ELASC

          <Card>
            <CardHeader>
              <InputGroup>
                <Input type="text" innerRef={todoInput} placeholder="my todo"/>
                <Button color="primary" onClick={addTodo}>Add Todo</Button>
              </InputGroup>
            </CardHeader>
          </Card>

          <ListGroup>
            {todos.map((todo) => {
              return <ListGroupItem style={{fontSize: '18px', color: 'black'}}>
                {todo.text}
              </ListGroupItem>
            })}
          </ListGroup>
        </div>}
      </header>
    </div>
  );
}

export default App;
