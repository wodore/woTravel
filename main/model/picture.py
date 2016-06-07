# coding: utf-8
"""Provides implementation of User model and User"""
from __future__ import absolute_import

from google.appengine.ext import ndb
import model
import util


class PictureValidator(model.BaseValidator):
    """Defines how to create validators for user properties. For detailed description see BaseValidator"""
    name = [0, 20]
    description = [0, 450]

class Picture(model.Base):
    """A class describing datastore users."""
    name = ndb.StringProperty(required=True,default='', validator=PictureValidator.create('name'))
    description = ndb.StringProperty(indexed=False, validator=PictureValidator.create('description'))
    # either give a icon url (to an uploaded icon) or a icon name of an existing material icon
    url = ndb.StringProperty(default='',required=False, indexed=False)
    blob = ndb.BlobKeyProperty(required=True, indexed=False)

    added_by = ndb.KeyProperty(kind="User",required=True) # the user which added this expense type
    fellow_travelers = ndb.KeyProperty(kind="FellowTraveler",repeated=True)
    datetime = ndb.DateTimeProperty(required=True)
    location = ndb.KeyProperty(kind=model.Location,repeated=False)
    geo_picture = ndb.GeoPtProperty(indexed=True) # lat/long coordinates

    PUBLIC_PROPERTIES = ['url', 'name', 'description','added_by','fellow_travelers','datetime','location','geo_picture']


    PRIVATE_PROPERTIES = []

    @classmethod
    def qry(cls, name=None, added_by=None, location=None, **kwargs):
        """Query for fellow-travelers"""
        qry = model.Base.qry(model.Picture,**kwargs)
        if name:
            qry = qry.filter(cls.name==name)
        if added_by:
            qry = qry.filter(cls.added_by==added_by)
        if location:
            qry = qry.filter(cls.location==location)
        return qry



