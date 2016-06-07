# coding: utf-8
"""Provides implementation of User model and User"""
from __future__ import absolute_import

from google.appengine.ext import ndb
import model
import util

import datetime


class LocationValidator(model.BaseValidator):
    """Defines how to create validators for user properties. For detailed description see BaseValidator"""
    name = [2, 100]
    description = [0, 800]
    country = [0, 100]
    country_code = [2, 2]

class Expenses(model.Base):
    type = ndb.KeyProperty(kind=model.ExpenseType)
    amount = ndb.FloatProperty()
    note = ndb.StringProperty(default='',required=True, indexed=False)

class Transport(model.Base):
    waypoints = ndb.GeoPtProperty(repeated=True,indexed=False) # lat/long coordinates
    name = ndb.StringProperty(default='none',required=True, choices=['other','none','plane','boat','car','taxi','train','bus','bike','motobike','foot','hitchhiking'])
    icon = ndb.StringProperty(default='',required=True)
    note = ndb.StringProperty(default='',required=True)

class Location(model.Base):
    """A class describing datastore users."""
    name = ndb.StringProperty(required=True,default='', validator=LocationValidator.create('name'))
    description = ndb.StringProperty(indexed=False, validator=LocationValidator.create('description'))
    avatar_url = ndb.StringProperty(default='',required=False, indexed=False)
    trip = ndb.KeyProperty(kind="Trip",required=True)
    start_datetime = ndb.DateTimeProperty(required=True)
    end_datetime = ndb.DateTimeProperty(required=True)
    duration = ndb.FloatProperty(required=True,default=1) # how many days

    geo = ndb.GeoPtProperty(indexed=True) # lat/long coordinates
    country = ndb.StringProperty(required=True,default='', validator=LocationValidator.create('country'))
    country_code = ndb.StringProperty(required=True,default='', validator=LocationValidator.create('country_code'))
    pictures = ndb.BooleanProperty(default=False)
    fellow_travelers = ndb.KeyProperty(kind="FellowTraveler",repeated=True) # TODO add as local strucered property?
    expenses = ndb.StructuredProperty(Expenses, repeated=True)
    trans_to = ndb.StructuredProperty(Transport)
    trans_from = ndb.StructuredProperty(Transport)

    PUBLIC_PROPERTIES = ['avatar_url', 'name', 'description','trip','start_datetime','end_datetime','duration','geo','country','country_code','pictures','fellow_travelers',{'expenses':['amount','type','note']},'trans_to','trans_from']

    PRIVATE_PROPERTIES = []


    def _pre_put_hook(self):
        self.start_datetime = getattr(self,"start_datetime") or datetime.datetime.now()
        self.end_datetime = getattr(self,"end_datetime") or self.start_datetime
        self.duration = (self.end_datetime - self.start_datetime).days + 1
        print self.duration


    @classmethod
    def qry(cls, name=None, trip=None, country=None, fellow_traveler=None, **kwargs):
        """Query for way points"""
        #qry = cls.query(**kwargs)
        qry = model.Base.qry(model.Location,**kwargs)
        if name:
            qry = qry.filter(cls.name==name)
        if trip:
            qry = qry.filter(cls.trip==trip)
        if country:
            qry = qry.filter(cls.country==country)
        if fellow_traveler:
            qry = qry.filter(cls.fellow_traveler==fellow_traveler)
        return qry



