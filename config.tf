variable "BASIC_AUTH_USER" {}

variable "BASIC_AUTH_PASSWORD" {}

terraform {
  backend "http" {
    username = "${var.BASIC_AUTH_USER}"
    password = "${var.BASIC_AUTH_PASSWORD}"
    address = "https://iwr-state.herokuapp.com/state"
  }
}

provider "aws" {
  region     = "us-east-2"
  access_key = "AKIAIY4674H35LVDSFDA"
  secret_key = "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"
}
