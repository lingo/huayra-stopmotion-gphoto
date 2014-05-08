# Huayra stopmotion gphoto2 client #

This is a work in progress to allow [Huayra Stopmotion](https://github.com/HuayraLinux/huayra-stopmotion)
to use the ghoto2 backend to provde cameras.

Currently huayra-stopmotion listens via WebSockets for cameras, and provides a webpage to easily connect your webcam or mobile.

I wanted a way to connect my Canon EOS as a provider of images.

This script is the inital implementation.

## Usage ##

Load huayra-stopmotion and create a new project or load an existing one.
In the 'Opciones' tab you'll see the address where huayra is listening for cameras.

Run the following:
`node gphotoclient.js <PORT>`
where *PORT* is the port on which huayra is listening.



## Attribution ##

The guitar animation images used in simulation mode come from here:

http://artistlimited.deviantart.com/art/Animated-Guitarist-273391288
