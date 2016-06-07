# coding: utf-8
"""Provides implementation of User model and User"""
from __future__ import absolute_import

from google.appengine.ext import ndb
import model
import util


class LayerOptions(ndb.Expando):
    """A class describing datastore users."""
    pass

class TileValidator(model.BaseValidator):
    """Defines how to create validators for user properties. For detailed description see BaseValidator"""
    name = [0, 30]

class Tile(model.Base,ndb.Expando):
    """A class describing datastore users."""
    name = ndb.StringProperty(required=True,default='', validator=TileValidator.create('name'))
    type = ndb.StringProperty(default='xyz',required=True)
    layerOptions = ndb.StructuredProperty(LayerOptions ,required=False)
    active = ndb.BooleanProperty(default=True,required=True)



    PUBLIC_PROPERTIES = []

    PRIVATE_PROPERTIES = []

    @classmethod
    def qry(cls, name=None, active=None, **kwargs):
        """Query for fellow-travelers"""
        qry = model.Base.qry(model.Tile,**kwargs)
        if name:
            qry = qry.filter(cls.name==name)
        if active:
            qry = qry.filter(cls.active==active)
        return qry



