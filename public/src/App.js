import React from 'react';
import {
  Grid,
  makeStyles,
  Dialog,
  Button,
  DialogContent,
  Fab,
  Card,
  CardContent,
  CardMedia,
  Typography,
  LinearProgress,
  CardHeader,
  CardActions,
  Avatar,
  IconButton
} from '@material-ui/core'
import {
  KeyboardArrowUp,
  Add,
  MoreVert as MoreVertIcon,
  Print,
  ExpandMore as ExpandMoreIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon
} from '@material-ui/icons';
import { createMuiTheme } from '@material-ui/core/styles';
import Scene from './Scene'
import io from 'socket.io-client';
const theme = createMuiTheme()
const ENDPOINT = 'http://192.168.1.6:5000';

const style = theme => ({
  root: {
    height: '100vh'
  },
  fabLeft: {
    position: 'absolute',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
  },
  loading:{
    height: 10,
    width: '100%'
  },
  media: {
    display: 'block',
    width: '100%',
    height: 'auto'
  },
  dialog: {
    
  },
  fabRight: {
    position: 'absolute',
    bottom: theme.spacing(2),
    left: theme.spacing(2),
  }
})

const useStyles = makeStyles(style)
function App() {
  const classes = useStyles()
  const [open, setOpen] = React.useState(false)
  const [rtImage, setRtImage] = React.useState(null);
  const [socket, setSocket] = React.useState(null)
  const inputEl = React.useRef(null)

  const [loading, setLoading] = React.useState(false)
  const load = () => setLoading(true)
  const done = () => setLoading(false)

  const emitAdd = () => {
    load()
    socket.emit('click', {
      dx: 3,
      dy: 4
    })
  }

  const emitDoRayTrace = (camera, objects) => {
    load()
    socket.emit('screenshot', {
      camera,
      objects
    })
    setOpen(true)
  }

  const setup = () => {
    const socket = io.connect(ENDPOINT)
    socket.on('screenshot', (config) => {
      done()
      const { rt_data } = config
      const img = `data:image/png;base64,${rt_data}`
      setRtImage(img)
    })
    setSocket(socket)
    if (!inputEl.current) {
      return
    }
  }

  React.useEffect(setup, [])
  React.useEffect(() => {
    open && setRtImage(null)
  }, [open])
  return (
    <div className={classes.root}>
      <Scene
        onClick={emitAdd}
        onSnapshot={emitDoRayTrace}
        loading={loading}
      />
      <Dialog
        fullWidth={true}
        maxWidth={'sm'}
        onClose={() => setOpen(false)}
        aria-labelledby="simple-dialog-title"
        open={open}
        classes={{
          paper: classes.dialog
        }}
      >
          <Card classes={{
            root: classes.dialog
          }}>
          <CardHeader
        avatar={
          <Avatar aria-label="recipe" className={classes.avatar}>
            R
          </Avatar>
        }
        action={
          false && <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        }
        title="Ray Tracing"
        subheader="by Python"
      />
          {
            !rtImage ? 
            <LinearProgress variant="query" classes={{
              root: classes.loading
            }}/>
            : 
            <CardMedia>
              <img
                className={classes.media}
                src={rtImage}
              />
            </CardMedia>
          }
      <CardActions disableSpacing>
        <IconButton aria-label="add to favorites">
          <FavoriteIcon />
        </IconButton>
        <IconButton aria-label="share">
          <ShareIcon />
        </IconButton>
      </CardActions>
          </Card>
      </Dialog>
    </div>
  );
}

export default App;
