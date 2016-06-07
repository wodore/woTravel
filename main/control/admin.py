# coding: utf-8
from __future__ import absolute_import

from google.appengine.ext import ndb

import flask
#import wtforms

import auth
import config
import model
import control
import util

import os
from main import app


from .init import *

import cloudstorage as gcs

from google.appengine.api import images
from google.appengine.ext import blobstore

###############################################################################
# Initialization Stuff
###############################################################################
@app.route('/admin/init/', methods=['GET', 'POST'])
def admin_init():
    config_db = model.Config.get_master_db()
    updated="updated"
    if not config_db.app_initialized:
        # somethin which should just be executed once
        config_db.app_initialized = True
        config_db.put()
        updated="initialized"

    tiles.basic();
    expense_types.basic();

    return flask.make_response("<h1>App {}</h1>".format(updated))


