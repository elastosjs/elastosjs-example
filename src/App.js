import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Row, Col, Card, CardHeader, CardBody, Input, InputGroup, Button, ListGroup, ListGroupItem } from 'reactstrap'
import './App.scss'
import 'bootstrap/dist/css/bootstrap.min.css'
import styled from 'styled-components'

import { fromConnection, ephemeral } from '@openzeppelin/network'
import Fortmatic from 'fortmatic'
import { GSNProvider } from '@openzeppelin/gsn-provider'
import Web3 from 'web3'
import { elajs } from 'ela-js'

import { useEffectTrigger } from './useEffectTrigger'

import { LoadingOverlay } from './Loading'

const TESTNET_RPC = 'https://rpc.elaeth.io'
const ELAJS_DATABASE_CONTRACT_ADDRESS = '0x3F761DCC3780F14b75f603f30FAF56246Db4FFb8'
const ELA_RELAY_HUB_ADDR = '0x2EDA8d1A61824dFa812C4bd139081B9BcB972A6D'

const FORTMATIC_API_KEY = 'pk_test_55B6D44CB39F9CD8'



function App() {

  const [loading, setLoading] = useState(true)

  const [web3, setWeb3] = useState()
  const [elajsDb, setElajsDb] = useState()
  const [todos, setTodos] = useState([])
  const [gsnBalance, setGsnBalance] = useState(0)

  const [ethAddress, setEthAddress] = useState()

  const [effectTrigger, triggerEffect] = useEffectTrigger()

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

      const fortmatic = new Fortmatic(FORTMATIC_API_KEY, {
        rpcUrl: TESTNET_RPC,
        chainId: 21
      })
      const gsnProvider = new GSNProvider(fortmatic.getProvider())
      const fortmaticWeb3 = new Web3(gsnProvider)

      const elajsDb = new elajs.database({
        defaultWeb3: fortmaticWeb3,
        ephemeralWeb3: ephemeralWeb3,

        // make sure this is correct
        databaseContractAddr: ELAJS_DATABASE_CONTRACT_ADDRESS,
        relayHubAddr: ELA_RELAY_HUB_ADDR
      })

      // this opens the login
      await elajsDb.defaultWeb3.currentProvider.baseProvider.enable()

      // now get the ethAddress
      const ethAddresses = await fortmaticWeb3.eth.getAccounts()

      if (ethAddresses.length === 0){
        throw new Error('no fortmatic addresses found')
      }

      setEthAddress(ethAddresses[0])

      setWeb3(ephemeralWeb3)
      setElajsDb(elajsDb)

    })()
  }, [setLoading])

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

    if (todoText.length === 0){
      return
    }

    setLoading(true)

    // this will hold the new item
    const newTodo = {
      id: null,
      task: todoText
    }

    const cols = ['task']
    const vals = [todoText]

    const rowId = await elajsDb.insertRow('todo', cols, vals, {ethAddress})

    triggerEffect()

    todoInput.current.value = ''

  }, [todoInput, elajsDb, triggerEffect, ethAddress, setLoading])

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

      setLoading(false)
    })()

  }, [web3, elajsDb, setTodos, effectTrigger])


  /*
  ***************************************************************************
  * This doesn't work if we're using ephemeral keys
  ***************************************************************************
   */
  const handleDeleteTask = useCallback(async (ev) => {

    setLoading(true)

    const todoId = ev.currentTarget.dataset.todoId

    await elajsDb.deleteRow('todo', todoId, {ethAddress})

    triggerEffect()

  }, [elajsDb, triggerEffect, ethAddress, setLoading])

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

          <ListGroup>
            {todos.map((todo) => {
              return <ListGroupItem key={todo.id} style={{fontSize: '18px', color: 'black'}}>
                <Row>
                  <Col className="text-left">
                    {todo.task}
                  </Col>
                  <Col className="text-right">
                    <TrashIcon className="cil-trash" data-todo-id={todo.id} onClick={handleDeleteTask}/>
                  </Col>
                </Row>

              </ListGroupItem>
            })}
          </ListGroup>
        </div>}
      </header>
      {loading && <LoadingOverlay/>}
    </div>
  )
}

export default App

const TrashIcon = styled.i`
  cursor: pointer;

  &:hover {
    transition-property: color;
    transition-duration: 0.1s;
    color: #2eadd3;
  }
`
