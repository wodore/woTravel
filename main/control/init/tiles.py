# coding: utf-8
from __future__ import absolute_import
from google.appengine.ext import ndb
import model

class tiles(object):
    @classmethod
    def basic(cls):
        tiles = []
        if not model.Tile.qry(name="Outdoors").get():
            tiles.append(model.Tile(
                    name="Outdoors",
                    url = "http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png",
                    type = "xyz",
                    layerOptions = model.LayerOptions(
                        attribution= 'Maps &copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; Data <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                        )
                    )
                )

        if not model.Tile.qry(name="Cycle").get():
            tiles.append(model.Tile(
                    name = "Cycle",
                    url = 'http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
                    type = "xyz",
                    layerOptions = model.LayerOptions(
                        attribution= 'Maps &copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; Data <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                        )
                    )
                )

        if not model.Tile.qry(name="Transport").get():
            tiles.append(model.Tile(
                    name = "Transport",
                    url = 'http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png',
                    type = "xyz",
                    layerOptions = model.LayerOptions(
                        attribution= 'Maps &copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; Data <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                        )
                    )
                )

        if not model.Tile.qry(name="osm").get():
            tiles.append(model.Tile(
                   name = "osm",
                   url= "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                   type = "xyz",
                   layerOptions = model.LayerOptions(
                        attribution= '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        )
                    )
                )

        return ndb.put_multi(tiles)

