import React from 'react';
import {
  Card,
  CardMedia,
  Fab,
  Chip,
  Paper,
  CardActions,
  makeStyles,
  LinearProgress
} from '@material-ui/core'
import { pick } from 'lodash'
import * as THREE from 'three'
import AlloyFinger from 'alloyfinger'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Switch from '@material-ui/core/Switch';
import SpeedDial from '@material-ui/lab/SpeedDial';
import SpeedDialIcon from '@material-ui/lab/SpeedDialIcon';
import SpeedDialAction from '@material-ui/lab/SpeedDialAction';
import FileCopyIcon from '@material-ui/icons/FileCopyOutlined';
import SaveIcon from '@material-ui/icons/Save';
import PrintIcon from '@material-ui/icons/Print';
import AddIcon from '@material-ui/icons/Add';
import FavoriteIcon from '@material-ui/icons/Favorite';

import {
  Add,
  BorderInner,
  Print,
} from '@material-ui/icons';

const style = theme => ({
  root: {
    position: 'relative',
    height: '100%',
  },
  chips: {
    zIndex: 10,
    position: 'absolute',
    width: '100%',
    top: theme.spacing(2),
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(120px, 1fr))'
  },
  chip: {
    margin: theme.spacing(.25)
  },
  speedDial: {
    position: 'absolute',
    '&.MuiSpeedDial-directionUp, &.MuiSpeedDial-directionLeft': {
      bottom: theme.spacing(2),
      right: theme.spacing(2),
    },
    '&.MuiSpeedDial-directionDown, &.MuiSpeedDial-directionRight': {
      top: theme.spacing(2),
      left: theme.spacing(2),
    },
  },
  loading: {
    height: 1
  },
  canvas: {
    position: 'absolute',
    zIndex: 1,
    width: '100%',
    height: '100%'
  },
  fabLeft: {
    position: 'absolute',
    bottom: theme.spacing(6),
    left: theme.spacing(6),
  },
  fabRight: {
    position: 'absolute',
    bottom: theme.spacing(6),
    right: theme.spacing(6),
  },
})

const useStyles = makeStyles(style)

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const rnd = (from, to) => {
  return from + Math.trunc(Math.random() * (to - from))
}

const actions = [
  { icon: <SaveIcon />, name: 'Save' },
  { icon: <AddIcon />, name: 'Add' }
];

const configFactory = () => {
  const r = rnd(20, 100)
  return {
    color: getRandomColor(),
    proportion: [r, 48, 48],
    vect: [rnd(-100, 100), r, rnd(-100, 100)]
  }
}

const add = (scene, config, isPlane = false) => {
  const {
    color,
    proportion,
    vect
  } = config
  const geometry = new THREE.SphereGeometry(...proportion);
  const material = new THREE.MeshBasicMaterial({
    color,
    wireframe: true 
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = color
  scene.add(mesh);
  mesh.position.set(...vect)
  return { color, ...mesh , geometries: mesh.toJSON().geometries }
}

const getColorObj = () => ({
  'diffuse': Math.random() * .8,
  'specular_c': Math.random() * 2,
  'specular_k': 70. + Math.random() * 10.
})

const Scene = ({ onClick, onSnapshot, loading }) => {
  const classes = useStyles()
  const inputEl = React.useRef(null)
  const cardEl = React.useRef(null)
  const [open, setOpen] = React.useState(false);
  const [objects, setObjects] = React.useState([])
  const [scene, setScene] = React.useState(null)
  const [plane, setPlane] = React.useState(null)
  const [camera, setCamera] = React.useState(null)
  const removeObject = (color) => setObjects(objects.filter(obj => obj.color !== color))

  const handlerByName = (action) => {
    switch(action.name) {
      case 'Add': return handleAdd
      case 'Save': return () => {
        const cam = camera.toJSON()
        const { x, y, z } = camera.position.clone()
        //camera.getWorldDirection()
        const dir = camera.getWorldDirection()
        const matrix = camera.matrixWorldInverse
        return onSnapshot(
          {
            ...cam.object,
            position: [x, y, z],
            direction: [dir.x, dir.y, dir.z],
            mtx: matrix
          },
          [...objects.map(obj => ({
              name: obj.color,
              matrix: obj.matrix.toArray(),
              position: obj.position.toArray(),
              ...getColorObj(),
              geometries: obj.geometries
          })),
          {
            name: plane.name,
            ...getColorObj(),
            geometries: plane.geometries,
            position: plane.position
          }]
        )
      }
      default: return f => f
    }
  }

  const handleAdd = () => {
    const obj = add(scene, configFactory())
    setObjects(state => [...state, obj])
    onClick()
  }
  const handleRemove = (color) => {
    scene.remove(scene.getObjectByName(color))
    removeObject(color)
  }
  const handleClose = () => setOpen(false)
  const handleOpen = () => setOpen(true)

  const init = (element) => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000)
    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(element.clientWidth, element.clientHeight)
    element.appendChild(renderer.domElement)
    var controls = new OrbitControls( camera, renderer.domElement )
    var axesHelper = new THREE.AxesHelper( 25 );
    scene.add( axesHelper );

    var geometry = new THREE.PlaneGeometry( 800, 800, 32 );
    const pln_color = '#444466'
    var material = new THREE.MeshBasicMaterial( {color: pln_color, side: THREE.DoubleSide, opacity: 0.2} );
    var plane = new THREE.Mesh( geometry, material );
    plane.visible = true;
    plane.rotateX( - Math.PI / 2);

    plane.name = pln_color
    scene.add(plane)
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    camera.position.set(200, 300, 500 );
    camera.lookAt( scene.position );
    //console.log(scene.position)
    scene.add(camera)
    setScene(scene)
    setCamera(camera)
    setPlane({name: pln_color, geometries: plane.toJSON().geometries, position: plane.position.toArray()})
    const animate = function () {
      controls.update();
      requestAnimationFrame( animate );
      renderer.render( scene, camera );
    };
    animate();
  }

  React.useEffect(() => init(inputEl.current), [])
  return (
    <Paper ref={cardEl} className={classes.root}>
      { loading && <LinearProgress classes={{
        root: [classes.loading]
      }}/> }
      <div className={classes.chips}>
        {
          objects.map((object, id) => 
          <Chip
            variant="outlined"
            key={id}
            className={classes.chip}
            icon={<BorderInner style={{color: object.color}}/>}
            label="Object"
            onClick={f => f}
            onDelete={() => handleRemove(object.color)}
            color='primary'
          />)
        }
      </div>
      <div
        className={classes.canvas}
        ref={inputEl}
      />
      <SpeedDial
          ariaLabel="SpeedDial example"
          className={classes.speedDial}
          icon={<SpeedDialIcon/>}
          onClose={handleClose}
          onOpen={handleOpen}
          open={open}
          direction='up'
        >
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              vatiant='outlined'
              tooltipTitle={action.name}
              onClick={handlerByName(action)}
            />
          ))}
        </SpeedDial>
    </Paper>
  )
}

export default Scene