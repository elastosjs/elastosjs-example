import React from 'react'
import styled from 'styled-components'
import { HashLoader } from 'react-spinners'

const Loading = (props) => {

  const size = (props && props.size) || 150

  return (
    <div className="App body">
      <div style={{marginTop: '20%', display: 'flex', justifyContent: 'center'}}>
        <HashLoader
          size={size}
          color={"#4f789c"}
          loading={true}
        />
      </div>
    </div>
  )
}

export default Loading

const LoadingOverlay = () => {

  return <Overlay>
    <Loading/>
  </Overlay>

}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  background-color: rgba(255, 255, 255, 0.6);
`

export { LoadingOverlay }
