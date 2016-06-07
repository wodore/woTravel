# coding: utf-8
"""Provides implementation of User model and User"""
from __future__ import absolute_import

from google.appengine.ext import ndb
import model
import util


class TripValidator(model.BaseValidator):
    """Defines how to create validators for user properties. For detailed description see BaseValidator"""
    name = [2, 100]
    description = [0, 800]

class Trip(model.Base):
    """A class describing datastore users."""
    name = ndb.StringProperty(required=True,default='', validator=TripValidator.create('name'))
    description = ndb.StringProperty(indexed=False, validator=TripValidator.create('description'))
    avatar_url = ndb.StringProperty(default='',required=False, indexed=False)
    locations = ndb.KeyProperty(kind=model.Location,repeated=True)

    PUBLIC_PROPERTIES = ['avatar_url', 'name', 'description','locations']

    PRIVATE_PROPERTIES = []

    @classmethod
    def qry(cls, name=None, locations=None, **kwargs):
        """Query for way points"""
        #qry = cls.query(**kwargs)
        qry = model.Base.qry(model.Trip,**kwargs)
        if name:
            qry = qry.filter(cls.name==name)
        if locations:
            qry = qry.filter(cls.locations==location)
        return qry



