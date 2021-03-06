module SignupForm where

import Html exposing (..)
import Html.Events exposing (..)
import Html.Attributes exposing (id, type', for, value, class)

import StartApp
import Effects
import Http
import Task exposing (Task)
import Json.Decode exposing (succeed)

view actionDispatcher model =
  form
    [ id "signup-form" ]
    [ h1 [] [ text "Signup Form" ]
    , label [ for "username-field" ] [ text "Username: " ]
    , input [
      id "username-field"
      , type' "text"
      , value model.username
      , on "input" targetValue (\str -> Signal.message actionDispatcher { actionType = "SET_USERNAME", payload = str })
      ]
      []
    , div [ class "validation-error" ] [ text model.errors.username ]
    , label [ for "password" ] [ text "Password: " ]
    , input [
      id "password-field"
      , type' "password"
      , value model.password
      , on "input" targetValue (\str -> Signal.message actionDispatcher { actionType = "SET_PASSWORD", payload = str })
      ]
      []
    , div [ class "validation-error" ] [ text (viewUsernameErrors model) ]
    , div [ class "signup-button", onClick actionDispatcher { actionType = "VALIDATE", payload = "" } ] [ text "Sign Up!" ]
    ]

viewUsernameErrors model =
    if model.errors.usernameTaken then
      "Than username is taken!"
    else
      model.errors.username

update action model =
  if action.actionType == "VALIDATE" then
    let
      url =
          "https://api.github.com/users/" ++ model.username

      usernameTakenAction =
          { actionType = "USERNAME_TAKEN", payload = "" }

      usernameAvailableAction =
          { actionType = "USERNAME_AVAILABLE", payload = "" }

      request =
          Http.get (succeed usernameTakenAction) url

      neverFailingRequest =
          Task.onError request (\err -> Task.succeed usernameAvailableAction)

    in
    ( { model | errors = getErrors model }, Effects.task neverFailingRequest )
  else if action.actionType == "SET_USERNAME" then
    ( { model | username = action.payload }, Effects.none )
  else if action.actionType == "SET_PASSWORD" then
    ( { model | password = action.payload }, Effects.none )
  else if action.actionType == "USERNAME_TAKEN" then
    ( withUsernameTaken True model, Effects.none )
  else if action.actionType == "USERNAME_AVAILABLE" then
    ( withUsernameTaken False model, Effects.none )
  else
    ( model, Effects.none )

withUsernameTaken isTaken model =
  let
    currentErrors =
        model.errors

    newErrors =
        { currentErrors | usernameTaken = isTaken }

  in
    { model | errors = newErrors}

initialModel =
  { username = "", password = "", errors = initialErrors }

initialErrors =
  { username = "", password = "", usernameTaken = False }

getErrors model =
  { username =
    if model.username == "" then
      "Please enter a username!"
    else
      ""

  , password =
    if model.password == "" then
      "Please enter a password!"
    else
      ""

  , usernameTaken = model.errors.usernameTaken
  }

app =
  StartApp.start
    { init = ( initialModel, Effects.none )
    , update = update
    , view = view
    , inputs = []
    }

main =
  app.html

port tasks : Signal (Task Effects.Never ())
port tasks =
  app.tasks
