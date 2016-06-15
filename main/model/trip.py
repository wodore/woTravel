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
    start_datetime = ndb.DateTimeProperty(required=False)
    end_datetime = ndb.DateTimeProperty(required=False)
    duration = ndb.FloatProperty(required=True,default=1) # how many days

    PUBLIC_PROPERTIES = ['avatar_url', 'name', 'description','locations','start_datetime',
            'end_datetime','duration']

    PRIVATE_PROPERTIES = []

    def _pre_put_hook(self):
        print "LOCATIONS pre hook"
        if self.locations:
            print self.locations
            locs = []
            locs.append(self.locations[0].get())
            if len(self.locations) > 1:
                locs.append(self.locations[-1].get())

            self.start_datetime = locs[0].start_datetime or datetime.datetime.now()
            self.end_datetime = locs[-1].end_datetime or self.start_datetime
            self.duration = (self.end_datetime - self.start_datetime).days + 1


    @classmethod
    def qry(cls, name=None, locations=None, start_datetime=None,
            end_datetime=None, duration=None, **kwargs):
        """Query for way points"""
        #qry = cls.query(**kwargs)
        qry = model.Base.qry(model.Trip,**kwargs)
        if name:
            qry = qry.filter(cls.name==name)
        if locations:
            qry = qry.filter(cls.locations==location)
        if start_datetime:
            qry = qry.filter(cls.start_datetime==start_datetime)
        if end_datetime:
            qry = qry.filter(cls.end_datetime==end_datetime)
        if duration:
            qry = qry.filter(cls.duration==duration)
        return qry



